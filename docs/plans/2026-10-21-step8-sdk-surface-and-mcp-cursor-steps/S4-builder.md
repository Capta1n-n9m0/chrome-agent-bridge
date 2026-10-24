# S4 builder report — SDK failure reports

Builder: Opus 5.5, 2026-10-23. Takeover of a builder that died on an API error. It left
`sdk/test/failure-report.test.ts` (581 lines, untracked) and no `sdk/src` change. I checked every test in
that file against the brief, kept most of them, fixed two, added four, and wrote all of the source. HEAD
53f68db. Nothing is committed.

## 1. Built

- **`sdk/src/error.ts` (new, package-internal, not exported from `index.ts`):**
  - `ATTACH_CODES`: the seven codes, frozen. `ATTACH_BUDGET_MS = 5000`. `ATTACH_NETWORK_ENTRIES = 20`.
    `REPORT_MAX_LINES = 60`.
  - `FailureReportConfig {timers, env, homedir, now}` and `AttachOptions` (config + the raw `call` + the
    failing call's `ref`).
  - `attachContext(error, handle, opts)`: does nothing unless the code is in the set and the error has
    not been enriched yet. Otherwise it sends `snapshot {tab}`, `screenshot {tab}` (default mode) and
    `networkRequests {tab, limit: 20}` at the same time through the host's raw `call`, each with
    `timeoutMs: 5000`. They share one deadline, `opts.timers.setTimeout(…, 5000)`.
    - At the cut, each unfinished attachment gets `"<what>: not attached within 5 s"`.
    - A rejected attachment gets `"<what>: <CODE> <first line of message>"`.
    - Late results are ignored. If a late screenshot was already being written when the cut came, the
      file is removed.
    - It sets `snapshot`, `screenshotPath`, `network`, `attachErrors` (always, possibly empty) and
      `report` (an own property) on the same object. It never throws.
  - `failuresDir`: `BRIDGE_FAILURES_DIR` if non-empty, else `<home>/.chrome-agent-bridge/failures`.
    `screenshotFileName`: `<iso with : and . → ->-<handle>.png`.
  - `renderReport(input)` (pure) and the comment block required by item 11.
  - The augmentation `declare module "@bridge/shared/error" { interface BridgeError { snapshot?;
    screenshotPath?; network?; attachErrors?: string[]; report?: () => string } }`. It merges with the
    class with no edit to `shared/`: typecheck is green, and the tests use `err.report!()` and
    `err.snapshot` without casts.
- **`sdk/src/tab.ts`:**
  - `TabHost` gains an optional `failureReports?(): FailureReportConfig | null`; absent means off.
  - `#send` routes every call through a new `#reported(pending, ref)`. It awaits the call and, on a
    `BridgeError`, runs `attachContext` with the host's raw call, then rethrows the same object.
  - `download` (the whole `downloadToFile`) and `network({id})` are wrapped too.
  - The stale guard and local `BAD_PARAMS` throw before any call, so they are never enriched.
- **`sdk/src/client.ts`:**
  - `BridgeClientOptions` gains `failureReports?` (default true), `env?` (default `process.env`), and
    the test seams `homedir?` (default `os.homedir`) and `now?` (default `Date.now`).
  - The client's `TabHost` answers `failureReports()` with `{timers: the client's Timers, env, homedir,
    now}`, or null when the option is false.
  - Raw `call()` is unchanged, so it is never enriched.
- **`sdk/src/connect.ts`:** `ConnectOptions.failureReports?: boolean` (documented), passed to the client
  with `env`.

### Sample `report()` (120-element snapshot, two candidates, one failed request)
```
LOCATOR_NOT_FOUND: no button named "Sav".
Nearest candidates (none matched the locator):
  - button "Save draft" [ref=e60]
  - button "Saved" [ref=e61]
url: http://localhost:8080/e2e-playground.html   title: "Playground"
  … 35 lines above
- button "Button 36" [ref=e36]
  … (window centred on e60)
- button "Button 85" [ref=e85]
  … 35 lines below
Screenshot: C:/tmp/failures/2026-10-23T09-00-00-123Z-T3.png
Failed requests (1 of the tab's last 1):
  [r9]    2.0s ago   POST    500  xhr        100ms  —       http://localhost:8080/api/save
```
That is 60 lines in total.

## 2. Results

**`npx vitest run sdk/`**

At HEAD, with the partial file moved to the scratchpad:
```
 Test Files  18 passed (18)
      Tests  291 passed (291)
```
After:
```
 Test Files  19 passed (19)
      Tests  347 passed (347)
```
291 → 347 (+56, all in `sdk/test/failure-report.test.ts`).

`npx vitest run mcp/` (a check that the client change broke nothing; not my lane): `113 passed (113)`.

**`npm run typecheck`:** exit 0. All five projects are clean. S2b had no daemon or extension changes in
the tree when I ran it.

**`npm run build`:** exit 0 (`built daemon → dist/index.js`, `built mcp → dist/index.js`,
`built extension → dist/`).

**S4.3 grep:**
```
$ grep -rn "console\." sdk/src ; echo $?
1                      (empty stdout)
$ grep -rn "console\." sdk/src/error.ts ; echo $?
1                      (empty stdout)
```
In-suite check: the test "no 'console.' in any sdk/src file" walks `sdk/src`.

**Mutations I ran myself.** Each was applied with sed and reverted. Every one makes at least one test
fail:

| Mutation | Tests failing |
|---|---|
| budget 5001 | 3 |
| code filter removed | 19 |
| rejected attachments not recorded | 2 |
| cut not recorded | 2 |
| `limit: 20` dropped | 1 |
| hard cap removed | 1 |
| `formatSnapshot`'s footer kept | 1 |
| anchor ignored | 2 |
| every late-screenshot guard removed | 1 |
| `#send` not enriched | 22 |
| `ref` not passed | 1 |
| `connect` ignoring `failureReports` | 1 |

One survivor: removing only the two `if (cut) return` guards survives. The third guard (removing a file
written after the cut) still keeps the directory empty, so the guards back each other up. Removing all
three fails the test.

**Test changes to the inherited file:**
- The `TAB_HELD`/`TAB_GONE`/`NOT_CONNECTED` key check was a convoluted filter; it is now a plain
  `["code","data","name"]`.
- The `connect()` test now creates the fake `BRIDGE_DAEMON` file. `resolveDaemonPath` requires it to be
  a file.
- The late-screenshot test waits 300 ms of real time before reading the directory. Without that wait,
  a write that slipped through landed after the check, so the test could not fail.
- Added four tests:
  - the final hard cap, with newlines in a ref and in a path;
  - a small truncated snapshot shows the cap note instead of `formatSnapshot`'s footer;
  - `REF_STALE` through `tab.click("e300")` anchors on e300;
  - the in-suite console check stays as it was.

## 3. Files changed / created (commit pathspec)

```
sdk/src/error.ts                 (new)
sdk/src/tab.ts
sdk/src/client.ts
sdk/src/connect.ts
sdk/test/failure-report.test.ts  (new)
docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/S4-builder.md  (new, this report)
```
Not mine; leave out of the S4 commit unless the step agent owns them: `…-steps/S2b.ledger.md`,
`…-steps/S4.ledger.md`. `npm run build` rewrote the `dist/` bundles, which git does not track.

## 4. Deviations

1. **From the phase doc:**
   - It says "subclass". It is optional properties on the shared instance instead (#83, #86 item 6).
   - It says "snapshot capped at 60 lines". The whole report is ≤ 60 lines, which is stricter (design
     item 10).
2. **`BridgeClientOptions` grows four optional fields** (`failureReports`, `env`, `homedir`, `now`).
   `BridgeClientOptions` is an exported type, so strictly this grows the SDK's type surface. No new
   export or value is added, and `index.test.ts` passes unchanged. `homedir` and `now` are test seams.
   `ConnectOptions` gets only `failureReports` (phase doc) and passes its existing `env`. `homedir` and
   `now` cannot be injected through `connect()`.
3. **`timeoutMs` is a constant 5000, not a computed remaining budget.** All three attach calls are sent
   synchronously when the budget starts, so the remaining budget equals the whole budget. There is no
   "now" on `Timers` to measure elapsed time anyway. The floor of 100 is written as
   `Math.max(100, 5000)` to keep the rule visible.
4. **Candidates are rendered whenever `data.candidates` is an array, not only for `LOCATOR_NOT_FOUND`.**
   This covers `waitFor {locator}`'s `TIMEOUT` with the last candidates as `data` (#92 item 3), where
   the candidates are the most useful thing in the report. With `LOCATOR_NOT_FOUND` and an empty array
   it prints `No candidates near the locator.`
5. **`network({id})` is enriched too.** It is a raw host call without `tab`, wrapped the same way. Its
   failures (`INTERNAL` "No request with id") are not in the set, so in practice nothing attaches.
6. **Screenshot file name:** characters outside `[A-Za-z0-9_-]` in the handle become `_`. A handle is
   `T<n>`, so nothing changes in practice; this keeps a malformed handle out of the path.

## 5. Proposed decisions

**2026-10-23 · S4's failure-report details**
- **Decided:**
  1. The report fields are optional properties on the shared `BridgeError`, typed by augmenting
     `@bridge/shared/error` from `sdk/src/error.ts`. `attachErrors` is `string[]`, formatted
     `"<what>: <CODE> <first line>"` or `"<what>: not attached within 5 s"`, with `what` ∈
     `snapshot | screenshot | network`.
  2. Enrichment runs in `Tab` methods only (and so in the client's mirrored methods). Raw `call()` and
     errors thrown before a call are never enriched. An error is enriched at most once (a failing
     `focusTab` of a trusted click attaches once and the click is not sent).
  3. One 5 s deadline on the client's `Timers` covers all three attachments. Each attach call carries
     `timeoutMs: 5000`. Late results are dropped, and a screenshot written after the cut is deleted.
  4. The screenshot file is `<ISO time with : and . replaced by ->-<handle>.png`, in
     `BRIDGE_FAILURES_DIR`, else `<home>/.chrome-agent-bridge/failures` (Windows forbids `:`).
  5. `report()` is at most 60 lines for any input, in this order:
     - line 1, `CODE: message` (whitespace collapsed, ≤ 300 characters);
     - the candidates (≤ 5) or matches (≤ 8 shown, "… and N more");
     - the snapshot through `formatSnapshot`, without its footer, windowed into the remaining lines.
       The window is anchored on the first candidate or match found in the snapshot, else the failing
       call's ref, else the top, with `… N lines above/below`. When `truncated`, it adds "(the
       snapshot reached its 800-element cap; there may be more elements past it)";
     - `Screenshot: <path>`;
     - the failed requests (status ≥ 400 or an error, the newest 5, as `formatRow`), or one line
       saying none failed;
     - `Not attached:` with up to 5 attach errors;
     - a final hard cut at 60 lines ("… report cut at 60 lines").
  6. `connect({failureReports})` defaults to true and passes `env` to the client. `homedir` and `now`
     are client-level test seams only.
- **Why:** design items 1–10 of the step brief, #83 item 3, F25 and F35. A whole-report cap is what a
  model reads. Anchoring on the candidate shows the region the script was aiming at. Deleting a late
  file keeps "late results are ignored" true on disk.
- **Instead of:**
  - a subclass;
  - per-attachment timers;
  - computing a remaining budget per call (all calls start at t = 0);
  - `formatSnapshot`'s own "truncated at 800" footer (F35);
  - showing every failed request.
- **Revisit if:**
  - S5's MCP rendering needs structured attach errors;
  - S6 shows the 8-match or 5-request caps hide the useful entry;
  - a script needs `homedir` or `now` through `connect()`.

**2026-10-23 · A failing screenshot/focusTab attaches a second screenshot (F25, recorded, not changed)**
- **Decided:** built literally per 0.5. A `TIMEOUT` from `screenshot` or `focusTab` attaches a
  default-mode screenshot like any other call.
- **Why:** design item 9. F25's "skip the screenshot for these" is contract-level and is for the user.
- **Instead of:** special-casing those two methods.
- **Revisit if:** the user rules on F25.

## 6. Known effects and anything unfinished

- **The human's screen** (also in the `error.ts` comment):
  - On a window fully covered by other windows, `captureVisibleTab` does not return. The 5 s cut ends
    the SDK's wait, not the extension's switch: the human may see the failed tab in front for up to
    about 30 s (R9-RESTORE: TIMEOUT at 35 119 ms, previous tab back at +30 026 ms).
  - A minimized window gives `WINDOW_MINIMIZED`, which lands in `attachErrors`.
  - Another actor holding the visibility lock can turn the screenshot attachment into `LOCK_TIMEOUT`
    or a cut.
  - The default-mode screenshot switches tabs for about 1.5 s.
- **A script can wait on exit after a cut.** An attach call cut at 5 s stays pending in the client
  until its own timer runs out (`clientTimeoutMs(5000)` = 11 s) or `client.close()` is called. Real
  timers are not `unref`'d, so a script that does not call `close()` can wait up to about 6 s more
  before Node exits. This is the existing behaviour of any pending call, not something S4 added.
  Possible follow-up: S6 observes it.
- **Not run:** no live Chrome or daemon run (S6), and no full `npm test` across all workspaces. I ran
  `sdk/` and `mcp/` only, because S2b is in flight in the same tree.
- **Left for S5:** how the MCP gets reports (F25's open question: the MCP uses raw `call()`, which is
  not enriched).
