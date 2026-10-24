# S2a — fixer round 1 report (Step 9, stage S2a "Extension enforcement")

2026-10-24 · fixer r1, Claude Opus 5.5 (`claude-opus-5-5`) · brief `briefs/S2a-fixer1.md` · tree: HEAD `3d2c111` plus the
uncommitted S2a work · **nothing committed**; Chrome not touched; no daemon started; port 9234 never bound (`netstat -ano |
grep -c ":9234 "` → `0` at the end); no agents spawned. Lane kept: only `extension/src/{safety-call,safety-state,offscreen}.ts`,
one new `extension/src/relay-sender.ts`, one new test file `extension/test/s2a-fixer1.test.ts`. No existing test file edited
(pre-S2a or S2a's own).

## 1. Per finding

### Finding 1 (CRITICAL) — relative URL reaches the extension's own pages · **fixed**

- `extension/src/safety-call.ts`: new pure `extensionBaseUrl(id)` (= `chrome-extension://<id>/`, what
  `chrome.runtime.getURL("")` returns) and `resolveOpenUrl(url, base)`; private `openTarget()` wraps `ownTarget` for
  `navigate`/`newTab` only; `callTargets(method, params, tab, finalUrl?, extensionId = "")` gains a 5th argument;
  `CallSafety.decide` passes `view.ctx.extensionId` (set from `chrome.runtime.id` in `sw.ts:37`). Since `decide` serves
  receipt, effect and post, the resolution applies at every phase. `downloadStart` is untouched (http(s)-only regex).
- `resolveOpenUrl` rules: (a) a string `new URL(s)` parses as absolute is returned **exactly as written**, so no reply
  changes for an absolute URL, and the `javascript:`/`data:` checks still see the caller's string; (b) otherwise
  `new URL(s, base).href`; (c) a string the parser rejects even against the base (e.g. `http://exa mple.com`, `http://[`)
  is tested as `base` itself, so it is refused `DOMAIN_BLOCKED` ("The bridge never opens extension pages."). Why (c) and
  not "leave to today's handling": as far as I know, Chromium's tabs API resolves any string that is not a valid absolute
  URL as an extension resource, so Chrome would open such a string under `chrome-extension://<id>/` too (unmeasured; row
  SAFE-REL-2). Refusing it changes no reply for a parseable absolute URL, which is the brief's condition. An empty URL keeps
  today's path (`ownTarget` → `{kind:"own"}`, the handler's `BAD_PARAMS` / a blank new tab).
- **Base choice: the extension root (`getURL("")`), not the worker's script URL (`…/dist/sw.js`).** Why: as I recall
  Chromium's `ExtensionTabUtil::ResolvePossiblyRelativeURL` falls back to `extension->GetResourceURL(url)`, i.e. relative
  to the root (from memory, not verified here; SAFE-REL-1 reads the real resolution). The refusal does **not** depend on
  the choice: every relative form resolves to a `chrome-extension:` URL under either base, and `isExtensionUrl` refuses
  every one. Only the page name in the hypothetical resolution differs. An empty id (unknown) still gives a
  `chrome-extension:` base, so the check fails closed.
- Tests (`s2a-fixer1.test.ts` › "finding 1"): `/options.html`, `../options.html`, `options.html`, `example.com`, each for
  `navigate` and `newTab`, at receipt and at effect (16 tests, exact `{code: DOMAIN_BLOCKED, message:
  EXTENSION_URL_MESSAGE}`); `http://localhost:8080/x` allowed at receipt, effect and post for both (2); `callTargets`
  pass-through of absolute URLs, resolution of relative ones, `downloadStart` untouched, empty-id fail-closed (3);
  `resolveOpenUrl`/`extensionBaseUrl` pure cases (4).
- **Red before the fix** (tests written first; `relay-sender.ts` as a stub returning `true`, i.e. today's
  "no check" behaviour, so the file loads): `npx vitest run extension/test/s2a-fixer1.test.ts` → `Tests 29 failed | 6
  passed (35)`. All 16 receipt/effect tests and the 6 pure/`callTargets` resolution tests were red. The 6 that passed are
  the 2 "allowed absolute URL unchanged" guards, the absolute pass-through guard, the stub-accepted worker case, and the 2
  finding-5 tests (killed by mutation below).
- Mutations after the fix (driver `scratchpad/mut.cjs`: apply, run `s2a-fixer1 safety-state safety-call gated-router`,
  restore):
  ```
  F1 base not passed (pre-fix callTargets) → Tests  10 failed | 131 passed (141)
  F1 navigate own target raw → Tests  9 failed | 132 passed (141)
  ```
- Residual (stated, not fixed): a string the WHATWG parser accepts as absolute but Chrome's URL parser (GURL) rejects
  would be passed by the gate as absolute while Chrome resolves it under the extension. I know of no such string. If one
  exists, the tab still lands on an own page, and the `navigate` post-check plus every later call refuse it (own page). A
  stricter alternative needs a ruling because it changes replies while armed: refuse every `navigate`/`newTab` URL
  without an explicit `http`/`https`/`file`/`about`/… scheme.

### Finding 2 (MINOR) — no code (the step agent records it).

### Finding 3 (MINOR) — `offscreen.ts` accepts any extension context · **fixed**

- New `extension/src/relay-sender.ts`: `acceptOffscreenSender(sender, runtimeId)` → true only when `sender.tab ===
  undefined && sender.id === runtimeId` (and a non-empty id). It has no imports, so the offscreen bundle does not pull in
  the gate. `offscreen.ts`'s listener now begins with `if (!acceptOffscreenSender(sender, chrome.runtime.id)) return
  false;`. Nothing is logged.
- Tests: accepts the worker; refuses a content script (has `tab`), an extension page in a tab, another extension's id, no
  id, no sender, an empty runtime id; a static test checks that the check comes before `msg?.target` and `msg.type`.
- Red: the stub (accept all) → "refuses a content script…" red (in the 29 above). Mutations: `F3 predicate ignores tab →
  1 failed`; removing the check line from `offscreen.ts` → `Tests 1 failed | 35 passed (36)` (static test).
- Built bundle: `grep -c "tab === void 0\|tab === undefined" extension/dist/offscreen.js` → `1`.
- S4 row: SAFE-0 doubles as the proof that the relay still works (see §3).

### Finding 4 (MINOR) — a failed toggle write · **fixed**

- `extension/src/safety-state.ts`: both disarm writes in `toggleOnce` (armed → disarmed, and unreadable → disarmed) go
  through a new private `writeDisarm()`. It calls `set` once more after a first rejection. A second rejection returns the
  new outcome **`"write-failed"`**: `ToggleOutcome = "disarmed" | "armed" | "ignored" | "write-failed"`. The memory copy
  was disarmed before the write (as before) and is never re-armed. `onDisarm` ran once, `read()` keeps reporting
  `armed:false` (decision 4's AND), the ingest drops, and `lastDisarmAt` is set, so a re-toggle within 1 000 ms is
  `"ignored"`. I chose a typed outcome rather than a rejection: the toggle did take effect for this worker, and a
  rejection would read as "nothing happened". The serialising chain is not broken.
- Tests: one failure → retried → `"disarmed"`, 2 `set` calls, stored `false`; two failures → `"write-failed"`, 2 calls,
  storage untouched, memory `armed:false`, `onDisarm` once, `onArm` never, `read()` and `ingestView()` both disarmed;
  the unreadable branch gets the same retry and outcome; the chain still runs the next toggle.
- Red: all 4 red before the fix (the toggle rejected). Mutations: `F4 no retry → 4 failed`; `F4 memory re-armed on
  failure → 3 failed`.
- Not changed (outside the finding): a failed **arm** write still rejects `toggle()` with memory already armed, while
  storage says disarmed. Calls stay refused (`read()` reads storage), but the ingest records. S2b's caller should treat a
  rejection as "still OFF". Noted for the step agent.

### Finding 5 (NIT) — two surviving mutants · **tests added**

- 5a: "a second connection-up sends the state again" (up → offer → up → offer, no down in between). V5 (drop `this.last =
  null` from `connectionUp`) → `Tests 1 failed | 140 passed (141)`.
- 5b: intended outcome: **`listTabs` gets no post-check, even when the state turns unreadable after `redactRows`.** The
  rows were redacted under a successful read inside the call. #134 says `listTabs` is redacted, not refused. S1's handoff
  says the post-check covers "all but `listTabs`". #139's fail-closed rule is met where `listTabs` does read: at receipt
  and in `redactRows`, both of which refuse on an unreadable state, as the builder decided. The test checks that `post()`
  returns null and reads no state. V20 (remove the exemption) → `Tests 1 failed | 140 passed (141)`.

### Finding 6 (NIT) — `start()` never retries · **fixed**

- `SafetyStore.read()`: after a successful parse, `if (this.mem === null) this.apply({ ...stored }, "load")`. This is the
  raw stored copy, taken before decision 4's AND, so a failed first load is filled by the first read that succeeds.
  `"load"` means `onDisarm` runs when storage says disarmed, but the re-arm guard clock does not start (same as `start()`).
- Tests: `ingestView()` null after the failed load, then set after a read; a stored disarm found that way fills memory
  disarmed and runs `onDisarm` once. Red before the fix (both). Mutation `F6 read does not fill memory → 2 failed`.

### Findings 7, 8 (NIT) — no code (accepted as notes).

## 2. Checks (re-run after the fix)

| Command | Before (verifier) | After |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `npm test` | `Test Files 105 passed (105)` · `Tests 2525 passed (2525)` | `Test Files 106 passed (106)` · `Tests 2561 passed (2561)` |
| `npm run build` | exit 0 | exit 0 (`built extension → dist/`) |
| `grep -c '^import\b' extension/dist/content.js` / `'^export\b'` | 0 / 0 | 0 / 0 |
| `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` | 0 | 0 |
| `grep -n "console\." extension/src/relay-sender.ts extension/src/safety-*.ts extension/src/offscreen.ts` | — | nothing |

+36 tests, all in the new file `s2a-fixer1.test.ts` (2525 + 36 = 2561). `relay-sender.ts` does not match `safety-*`, so
S1's `safety-static.test.ts` generates no extra tests for it.

## 3. Toggle API for S2b (updated)

- `safety.toggle(): Promise<ToggleOutcome>`, `ToggleOutcome = "disarmed" | "armed" | "ignored" | "write-failed"`.
  - `"disarmed"`: the disarm is saved (possibly on the retry).
  - `"write-failed"`: **disarmed in force for this worker** (every call refused, ingest dropping, debugger sessions
    detached, downloads cleared) but **not saved**. `storage.local` still holds the previous value, so a worker restart
    or reload would read it back. S2b must show the badge `OFF` and make the failure visible (e.g. the badge title "OFF
    — not saved; press again or use the options page"), and log one line without content.
  - `"armed"` / `"ignored"`: as before (#144). A failed **arm** write still **rejects**, and S2b should then show the
    badge `OFF` (calls stay refused because `read()` reads storage).
- Everything else in `S2a-builder.md` §4 stands.

## 4. New S4 rows (expected text written before any run)

- **SAFE-REL-1 — a relative `navigate` URL is refused and opens nothing.** Fixture tab on `http://localhost:8080/…`,
  armed, JS on, empty list. An SDK script calls `tab.navigate("/options.html")` (raw `navigate {url:"/options.html"}`).
  Expected: the call fails with `DOMAIN_BLOCKED: The bridge never opens extension pages.`; then `listTabs` (or a page
  reporter) shows the tab's URL **unchanged** (still the fixture URL), and no tab shows a `chrome-extension://` URL. Same
  for `newTab {url:"options.html"}`: `DOMAIN_BLOCKED`, and the tab count is unchanged.
- **SAFE-REL-2 — what Chrome would open (measurement, not via the bridge).** In the driver's own window, on the
  service-worker DevTools console of the extension (driver only, no bridge call), run `chrome.tabs.create({url:
  "/options.html", active:false})` and read the new tab's `pendingUrl`/`url`, then close it. Expected:
  `chrome-extension://<id>/options.html`. Record it verbatim with the id redacted, and repeat with `"example.com"`
  (expected `chrome-extension://<id>/example.com`). This confirms the base the fix assumes. If Chrome resolves elsewhere
  but still under `chrome-extension:`, the fix stands. If it resolves to a non-extension URL, report it as a finding. Skip
  the row if the grant does not cover the worker's DevTools.
- **SAFE-0 (named for finding 3)** — after the reload, the first bridge call answers at all (its refusal or result
  arrives). If the offscreen sender check rejected the worker, `connect` would be ignored and every call would end in
  `TIMEOUT` (or `connect()` would blame Chrome). This also covers the builder's §5 row 1 (the worker's own sender check).

## 5. Deviations

- Finding 1(c): an unparseable `navigate`/`newTab` string is refused (`DOMAIN_BLOCKED`) rather than left to Chrome. It is
  stricter, and it changes no reply for a parseable absolute URL. This decides "a code chosen for a refusal" for those
  strings, so the step agent should list it.
- No new code path allows anything that was refused before. Every change refuses more or adds a test.

## 6. Proposed decisions

**2026-10-24 · S2a fixer r1: `navigate`/`newTab` are gated on the URL Chrome will open**
Decided: a URL that the WHATWG parser takes as absolute is tested as written. Any other string is resolved against
`chrome-extension://<id>/` and tested as that URL. A string that cannot be resolved is tested as the base, so it is
refused `DOMAIN_BLOCKED` (#138). Why: Chrome resolves non-absolute URLs inside the extension, and verifier finding 1 showed
`/options.html` slipping through. Instead of: refusing every scheme-less URL (equivalent in effect, but it hard-codes the
refusal rather than deriving it), or leaving unparseable strings to Chrome (which opens them under the extension).
Revisit if: SAFE-REL-2 shows Chrome resolving against another base, or a GURL/WHATWG disagreement is found. By: Claude
— contract-level (what is refused), list under Open decisions.

**2026-10-24 · S2a fixer r1: a disarm whose write fails twice is `"write-failed"`, still disarmed in memory**
Decided: one retry, then the typed outcome `"write-failed"`. Memory stays disarmed and is never re-armed. Why: a rejection
would hide that the disarm is in force. Re-arming memory would undo the human's press. Instead of: rejecting the promise;
retrying with backoff. Revisit if: S2b finds the badge cannot show it. By: Claude.

**2026-10-24 · S2a fixer r1: the offscreen document accepts only this extension's non-tab senders**
Decided: `sender.tab === undefined && sender.id === chrome.runtime.id`. Why: verifier finding 3. It needs no measured URL.
Instead of: matching the worker's script URL. Revisit if: SAFE-0 fails. By: Claude.

**2026-10-24 · S2a fixer r1: `listTabs` keeps no post-check when the state turns unreadable mid-call**
Decided: as built. The test pins it. Why: #134, S1's handoff, and the rows were redacted under a successful read in the
same call. By: Claude — contract-adjacent (what `listTabs` reveals), list with finding 2a.
