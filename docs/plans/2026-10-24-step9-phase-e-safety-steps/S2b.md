# Step 9 S2b — Extension UI and the 0.7 log scan: step report

2026-10-24 · step agent, Claude Opus 5.5 (`claude-opus-5-5`) · base HEAD `55f4d6e` · ledger `S2b.ledger.md` ·
briefs `briefs/S2b-{builder,verifier,fixer1}.md` · sub-reports `S2b-builder.md`, `S2b-verifier.md` (rounds 1 and 2),
`S2b-fixer1.md`. Step 9's own S2b; Step 8's S2b is unrelated. Nothing ran against the real Chrome; the extension was
not reloaded; port 9234 was never bound (the sentinel test's daemon binds port 0); no agent spawned below level 2.

## 1. Verdict

**DONE, with one escalation** (§6 finding 1: S2a's file, outside this lane). Verifier round 2: **PASS-with-notes**
(one fix round used of two). Budget 1.5 h; actual ≈ 50 min of agent time (builder 17 min, verifier r1 19 min,
fixer r1 10 min, verifier r2 5 min), 11:52Z → 12:47Z wall-clock plus close.

## 2. Outputs

- Commit: `feat(extension): S2b — toolbar button, shortcut, badge, options page, log scan (verifier: PASS-with-notes)`
  (hash in the ledger).
- Tests: `npm test` **2561 passed / 106 files → 2660 passed / 113 files** (+99: builder +84 in 7 new files, fixer +15),
  re-derived by the verifier in both rounds. No pre-S2b test file changed (`git diff --stat -- extension/test daemon sdk
  mcp shared recipes` lists none). `npm run typecheck` exit 0; `npm run build` exit 0, no tracked file changed by it.
- Changed: `extension/manifest.json` (only `action` with a `default_title`, no popup, and `commands`
  `{"_execute_action": {"suggested_key": {"default": "Alt+Shift+K"}}}` — no permission added), `extension/options.html`,
  `extension/src/options.ts` (port/token code unchanged), `extension/src/sw.ts` (the top-level `action.onClicked`
  listener, the badge start-up and refresh on a safety-key change, the one log line per press).
- New: `extension/src/badge.ts` (pure derivation + `BadgeController`), `extension/src/options-model.ts` (block-list line
  analysis through S1's parser, view-model); tests `badge`, `options-model`, `manifest`, `sw-action`, `safety-writers`,
  `log-scan` (+ `log-scan.ts`, `log-allowlist.ts`), `log-sentinel` in `extension/test/`.

Exit checks (verifier r1 table, r2 re-checks):

| ID | Result | Evidence |
|---|---|---|
| S2.3 (#141) | PASS | `log-scan.test.ts`: the verifier's independent enumeration found the same 48 sites (r1); after fixer r1 the allowlist is 60 entries (extension 15, daemon 33, sdk 0, mcp 6 — the new ones copy, pass or test a logger and print nothing); red on `console.log("x", url)`, `process.stderr.write`, `deps.warn?.()`, `log.bind`, a destructured `process.stdout`. `log-sentinel.test.ts` drives gate, matcher, router, network gate, toggles, badge, options model and the real daemon over `ws` on port 0: no sentinel pattern/URL/title/token in any captured line; red on a daemon mutation logging the event and a gate mutation logging a hostname |
| S2.4 | PASS | after `npm run build`: `grep -c '^import\b'` / `'^export\b' extension/dist/content.js` → 0/0; `sw-static.test.ts` AST test green, red on the appended-`await` mutation; column-0 grep 0 |
| S3.3, `storage.local.set` half (#141/#147) | PASS | `safety-writers.test.ts`: only `safety-state.ts` and `options.ts` write safety keys; `remove`/`clear` refused everywhere; `chrome` allowed only as a property-access object; red on alias, destructuring (`storage`, `local`), parameter-default alias, a handler write (W8, W9, W12 and two more) |
| Manifest: only `action`, `commands`; no new permission | PASS | `manifest.test.ts` (permissions/host permissions equal today's, no `default_popup`, `commands` exactly #142's); verifier read the diff |
| `action.onClicked` at top level; no `commands.onCommand` | PASS | `sw-action.test.ts`, red on moving the call into a function |
| Badge derivation pure, per state incl. write-failed | PASS | `badge.test.ts`: armed, JS off, disarmed, OFF-wins (F37), unreadable, write-failed, ignored, rejected arm; #143's three titles verbatim |
| Existing tests unchanged; new tests red without the change | PASS | builder 8/9 mutations red (the 9th green by design, flagged by the scan instead), verifier r1 and r2 their own |

## 3. Verifier verdict

**PASS-with-notes** — `S2b-verifier.md` (round 1 PASS-with-notes with MINORs F1–F3 and NITs F4–F8; Round 2
PASS-with-notes with NITs R2-1, R2-2).

## 4. Deviations from the phase doc

- The sentinel test runs the real `WsHost` + `Bridge` over `ws` on port 0 (the relay path needs a socket).
- The badge's `storedArmed()` read in `sw.ts` uses `chrome.storage.local.get(null)` (fixer r1), which loads every
  local key, the token included, into a discarded value; only a boolean leaves it, nothing logs it (verifier R2-2,
  NIT). Kept as built; a narrower `get([...SAFETY_KEY_NAMES])` is feasible in lane and is listed below.
- The log scan identifies injected loggers by name (`log`, and level names on non-`console` objects); a logger under an
  unrelated name, `globalThis.process`, and `node:process` imports are not caught (stated in the scan's header; none
  exists today; R2-1).

## 5. Proposed decisions

Build-level, `By: Claude` (full texts: `S2b-builder.md` §10, `S2b-fixer1.md` Proposed decisions):

### 2026-10-24 · S2b: badge colours, and titles for the unreadable, unsaved-disarm and failed-arm states
**Decided:** `#d93025` red (`OFF`), `#e37400` amber (`JS`); #143's three titles verbatim; unreadable → `OFF`, "…the
safety state cannot be read, so agents are refused (check the options page)"; write-failed → `OFF`, "…OFF, but not saved
(storage write failed): agents are refused until the extension restarts (click to turn on)"; rejected arm → `OFF`,
"…turning on failed (storage write failed), agents are still refused (turn it on from the options page)". **Why:** #143
leaves colours and failure wording to the build; S2a's handoff (#174) asks the unsaved disarm to be visible.
**Instead of:** one OFF title for every OFF. **Revisit if:** the user prefers other words or colours. **By:** Claude

### 2026-10-24 · S2b: a failed-write title lasts until storage itself reads disarmed or the state moves on
**Decided:** `BadgeModel` keeps write-failed / arm-failed while reads say disarmed; it ends when the stored `armed` reads
false (e.g. the options page saved the OFF), a read says armed, or a press is saved. **Why:** the gate's `read()` masks the
stored value with the memory disarm (#176), so the title would otherwise outlive a successful save (verifier F5).
**Instead of:** showing it only until the next refresh. **Revisit if:** S4 shows a stale failure title. **By:** Claude

### 2026-10-24 · S2b: the badge's stored read is `storage.local.get(null)`
**Decided:** as built (fixer r1). **Why:** the writers test forbids naming safety keys in `sw.ts`; only a boolean leaves the
read; nothing logs it. **Instead of:** `get([...SAFETY_KEY_NAMES])` with the writers test allowing key names as a `get`
argument only (verifier R2-2: feasible in lane, 61/61 tests in a restored trial) — the better shape, deferred to keep the
stage in one fix round. **Revisit if:** at Step 10 or any later touch of `sw.ts`'s badge glue — then take the narrower
read. **By:** Claude

### 2026-10-24 · S2b: one fixed reason for every invalid block-list line
**Decided:** each invalid line is marked by number with one reason naming the grammar's shapes. **Why:** S1's parser
returns only `invalid`; per-cause messages would need a second grammar. **Instead of:** re-deriving causes; extending
`safety-match.ts` (S1's). **Revisit if:** the user wants per-cause messages. **By:** Claude

### 2026-10-24 · S2b: unsaved block-list edits survive a change made elsewhere
**Decided:** an untouched textarea follows the stored text; edited text is kept and a line says Save replaces the stored
list. **Why:** never lose typing, never overwrite silently. **Instead of:** always reloading; never reloading. **Revisit
if:** two options tabs editing at once matters. **By:** Claude

### 2026-10-24 · S2b: options page names and layout
**Decided:** labels per §7 row 5 below; switches save on change (#144, not debounced); the block list has its own Save;
one status line. **Why:** UIA finds controls by name. **Instead of:** one Save for everything. **Revisit if:** S4's
automation finds a name ambiguous. **By:** Claude

### 2026-10-24 · S2b: the log scan finds loggers by name
**Decided:** sites are every `console` use (call or value), `process.stdout`/`stderr`/`process` as a value, any call or
value use of `log`/`.log` (incl. `.call/.apply/.bind`), and `warn/info/debug/trace/error` on non-`console` objects; an
allowlist entry is file + normalized call text + a note; a stale entry fails. **Why:** stricter than listing today's
three injected-logger expressions. **Instead of:** a fixed list (`options.log`, `deps.log`). **Revisit if:** a
non-logging method with one of those names appears (allowlist it with a note). **By:** Claude

### 2026-10-24 · S2b: the writers test refuses `storage.local.remove`/`clear` everywhere — for user review (how the state is changed)
**Decided:** as built. **Why:** removing a safety key restores its default — armed — so it is a write in effect;
conservative; nothing uses them today. **Instead of:** allowing them outside the two writers. **Revisit if:** a feature
needs `remove` (name its site in the test). **By:** Claude (proposed)

## 6. Findings

1. **ESCALATION — S2a's `toggleOnce` leaves the memory copy armed after a rejected arm write** (`extension/src/safety-state.ts`,
   `this.apply({...current, armed: true}, "toggle")` before `await this.deps.set(…)`, never reverted). Found by the
   builder, confirmed by the verifier with a throwaway run. Effects: every call is still refused (storage reads
   disarmed), but `ingestView()` reports armed, so **the network log records traffic while storage, the badge and every
   call say OFF**, and the next press disarms instead of retrying. It contradicts #174's letter ("memory is never
   re-armed by a failed write") and touches "what the network log records while disarmed" — an ESCALATION item, and
   the file is outside S2b's lane, so it is not fixed here. Minimal fix (S2a's file): on a rejected arm write restore the
   memory copy to disarmed (without moving `lastDisarmAt`) before rethrowing, plus a test. Needs a `storage.local.set`
   failure (e.g. quota); not reachable by an agent. Recommended: a small in-lane fix stage on `safety-state.ts` before S4.
2. **Verifier F4 (NIT), accepted as an S4/S5 note:** after a `write-failed` disarm the options page shows the stored state
   ("Bridge armed.", switch ticked) while the badge says OFF and every call is refused (#176's memory disarm is not
   visible to the page). Cannot be produced live. S5 should document it; fixing it needs a worker→page channel.
3. **Verifier F6 (NIT, existing code):** `daemon/src/main.ts:208-209` logs the name a client gives itself
   (`client ± "<name>"`). Not a URL/title/pattern/token by contract, but client-chosen text; allowlisted with that note.
4. **F8 (NIT):** S2a's comment in `sw.ts` (~line 31) still says "S2b's `action.onClicked` will call it"; left.
5. S2a's older `sw-static.test.ts` text check misses an alias of `chrome.storage.local`; the new `safety-writers.test.ts`
   closes it (builder M4b).
6. The write-failed title says agents are refused "until the extension restarts": by #176 the disarm lives in the
   worker's memory, so a worker restart re-reads storage (armed). True to the code; worth a line in S5's docs.
7. No new runtime gotcha measured (no live run).

## 7. Handoff

**Nothing is running.** No PIDs; 9234 never bound.

**S4 rows for the UI (Chrome-only; expected text written before any run; from `S2b-builder.md` §8, checked by the
verifier against `options.html` and the manifest):**
1. **Button click** (armed, JS on): badge `OFF`, title `Chrome Agent Bridge — OFF: agents are refused (click to turn on)`;
   worker console `safety: disarmed by the user`; a call → `DISARMED` (scope all). Click again ≥ 1 s later: badge empty,
   title `Chrome Agent Bridge — armed (click to turn off)`, `safety: armed by the user`. A click within 1 s of a disarm:
   badge stays `OFF`, `safety: re-arm ignored (within 1 s of a disarm)`.
2. **Shortcut `Alt+Shift+K`**: same as row 1 (one listener). `chrome://extensions/shortcuts` shows "Activate the
   extension" = `Alt+Shift+K` if Chrome assigned it; whether Alt+Shift switches the Windows input language is SAFE-2's
   reading.
3. **JS off** (options switch): badge `JS` amber, title `Chrome Agent Bridge — armed, JavaScript off (click to turn
   off)`; disarm while JS off → `OFF` (OFF wins).
4. **Options page**: checkbox `Bridge on (agents may use this browser)`; checkbox `Allow JavaScript (browser_evaluate)`;
   textarea `Blocked sites, one per line`; button `Save blocked sites`; button `Change the keyboard shortcut`; unchanged
   `Port`, `Token`, `Save`. Status line (`role=status`): `Bridge armed.` / `Bridge armed; JavaScript (browser_evaluate)
   off.` / `Bridge OFF: agents are refused.` / `The safety state cannot be read, so agents are refused.` Switches save on
   change; the badge follows. Typing `bank.example` and `not a host!` → `1 blocked site. 1 invalid line is not counted
   (marked below).` and `Line 2: “not a host!” — not a site pattern: write a host (bank.example), *.host for its
   subdomains only, host:port, an IP address, or paste an http(s) address`; after Save, `safetyStatus.blockedCount` = 1.
   A toolbar click while the page is open flips its checkbox and status live. **Use only fixture/reserved names in the
   record; never the user's real list.**
5. **Shortcuts link**: `Change the keyboard shortcut` opens a tab at `chrome://extensions/shortcuts` (via
   `chrome.tabs.create`); unmeasured — record what happens (a refusal is swallowed, so "nothing happens" is the failure
   text).
6. **Badge at worker start**: disarm, `recipes/reload-extension.ps1`, then read the button: badge `OFF`, title as row 1.
7. **Not producible live**: `write-failed` and the rejected arm (need `storage.local.set` to fail) — unit-tested only.
8. **UIA hints**: the toolbar button's accessible name is expected to be its title (unmeasured) — match by the prefix
   `Chrome Agent Bridge —`, never by the bare name; it may sit inside the Extensions menu until pinned (G9-2). Options
   controls by the label names in row 4.

**For the session agent:** finding 1 (escalation) needs a ruling before S4 — a fix stage on `safety-state.ts` or an
accepted residual. The contract-level proposal in §5 (`remove`/`clear` refused) is for user review.
**Needs the user's keyboard:** nothing.
