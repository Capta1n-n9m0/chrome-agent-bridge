# Step 9 S4 — prep builder report (rows, helpers, wave sheet)

Builder: Opus 5.5, 2026-10-24, from HEAD `3821d0f`. No Chrome interaction, no `npm run build`, no daemon, no bridge
client, nothing on 9234 (the only socket opened was a 127.0.0.1:18383 smoke of `s9-redirect.py`, then stopped).

## 1. Verdict

Done. §4.20 committed first (`049a72a`), helpers + wave sheet + this report second (see §3). **The helpers are
untested against Chrome**: their pure rules are tested (`recipes/test/s9-rules.test.ts`, 33 tests, including a
drift test against the product constants), the TypeScript typechecks, the PowerShell parses and its offline
functions ran (`Get-S9Sha256 ''`, `Get-S9KeyboardLayouts`, `Format-S9Title`, `Test-SafeToKill`), and `s9.ts id |
nonce | mcp-config | scan-file` ran offline. Everything that touches Chrome (UIA of the toolbar, the Extensions
menu, the options page, `chrome://extensions/shortcuts`, DevTools) is unmeasured; the wave sheet's blocks 1–13 are
its live smoke.

## 2. Outputs

- `docs/e2e-test-plan.md` §4.20 (+ the SAFE lines of the §5 template) — commit 1.
- `recipes/s9-rules.ts` (pure: expected texts, `judge`, counts, timed verdicts, scans, actor args),
  `recipes/s9.ts` (SDK rows), `recipes/s9-actor.ts` (MCP actors, strict config), `recipes/s9-win.ps1` (UIA; UTF-8
  BOM), `recipes/s9-redirect.py` (8083), `recipes/tsconfig.s9.json`, `recipes/test/s9-rules.test.ts`,
  `recipes/README.md` (index rows) — commit 2.
- `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md` (order, commands, record template) — commit 2.

Checks: `npx tsc --noEmit -p recipes/tsconfig.s9.json` → exit 0. `npm test` → **2718 passed, 116 files** (before:
2685 / 115; +33 tests in 1 new file, none removed). `npm run typecheck` not run (no product file changed).

## 3. Rows in §4.20 (one line each)

SAFE-0 stale check (safety reported; navigate to own options → `DOMAIN_BLOCKED`; no toggle) · SAFE-11 start (found
state, hash) · SAFE-PIN (G9-2, the button's name) · SAFE-PERF (record) · SAFE-2 (a) key assigned? · SAFE-10 console
set-up · SAFE-1 toolbar disarm/re-arm, SDK + MCP + listTabs + daemon.status · SAFE-1b re-arm within 1 s ignored ·
SAFE-2 (b, c) shortcut + keyboard layout · SAFE-3 options switch, live follow · SAFE-6 JS off · SAFE-6b script URLs
while JS off · SAFE-6c `javascript:` with JS on (record) · SAFE-7 extension URLs · SAFE-REL-1 relative URLs ·
SAFE-REL-3 `view-source:` (part record) · SAFE-7b own page in a tab · SAFE-7c (not measured) · SAFE-7d `chrome://`
· SAFE-POP-1 opener lease · SAFE-CAP-1 capture verification (record) · SAFE-4 (a) locator wait · SAFE-4c seconds
wait · SAFE-4 (b) trusted type + banner · SAFE-4b lock queue · SAFE-OPT-1 block-list editor · SAFE-5 blocked tab ·
SAFE-5b redirect onto blocked · SAFE-5c downloads · SAFE-5d network log · SAFE-8 nothing logged while disarmed ·
SAFE-9 reload while disarmed + JS off + 1 pattern · SAFE-11 restore · SAFE-10 log/console scans · SAFE-OPT-2 shortcut
link · SAFE-ACL-1, SAFE-REL-2, SAFE-WAKE (not measured) · SAFE-UNIT (unit-tested only).

Not measured / record, and why: SAFE-7c (needs a gate exemption or a throwaway extension — a new grant); SAFE-ACL-1
(needs code in a content-script world; no bridge call runs there); SAFE-REL-2 (needs code typed into the worker's
DevTools console — code in the extension's own context); SAFE-WAKE (the worker never sleeps during the wave: 25 s
keepalive, offscreen socket, DevTools attached); SAFE-UNIT (both failed-write paths need `storage.local.set` to
fail); SAFE-6c, SAFE-CAP-1, SAFE-PERF, SAFE-REL-3's relative half (records by nature: Chrome's own answer, a race,
a cost). SAFE-2 (c) becomes not measured if (a) reads `unassigned` (the wave never assigns a key).

## 4. Deviations

1. **SAFE-0 does no toggle** (stage0-audit §7 had "disarm by toolbar; snapshot → DISARMED"). Its stale-proof is a
   `DOMAIN_BLOCKED The bridge never opens extension pages.` on `navigate` to the own options page plus
   `daemon.status.safety` being reported — both only a Step 9 build can give. Why: S4.2 needs SAFE-0 right after
   the reload, and the brief needs the found state read "before any toggle"; a toolbar disarm first would read the
   found state after a change. The original SAFE-0 check (toolbar → `DISARMED`) is SAFE-1's first step.
2. **The found state is not "keys absent" after the wave**: the restore writes the keys with the found values;
   absent and default parse identically (#171) and no remove is allowed (#188), so S4.4 is judged on the read
   values and the hash (pre-registered in §4.20's preamble).
3. **SAFE-4 (b) types 1000 characters, not 200**: at ~2 CDP commands per character a 200-character type may finish
   before a UIA press lands; 1000 widens the window. `0 < typed < n` is the rule; `NOT DISCRIMINATING` gets one
   re-run with only the press delay changed (pre-registered).
4. **`:8083` instead of a raw `8083` count** for SAFE-10's daemon-log rule (a pid or a time can contain the digits);
   the raw count is still printed.
5. **The worker-console rule** (SAFE-10's second half) fails on a bridge log line (`[bridge] …`, `safety: …`)
   carrying a URL or pattern, a non-fixture `://`, or the token; Chrome's own network-error entries for the wave's
   fixture fetches are printed as `CONSOLE-HIT` and are not bridge logging (0.7 is about the bridge's log calls).
6. Not run by me but in my lane: `recipes/README.md` gained index rows.

## 5. Proposed decisions

### 2026-10-24 · S4: the redirect fixture runs on 8083, not 8082
**Decided:** `recipes/s9-redirect.py` on 127.0.0.1:8083 (every GET → 302 to the same path on 8081). **Why:** 8082 is
`Bound` on 0.0.0.0 by `SystemSettings.exe` (PID 25896) on this machine (S4 ledger, the step agent's check).
**Instead of:** stage0-audit §7's 8082. **Revisit if:** never; mechanical. **By:** Claude (step agent, applied here)

### 2026-10-24 · S4: SAFE-0 proves the build without a toggle
**Decided:** SAFE-0 = `daemon.status.safety` reported + `navigate` to the own options page → `DOMAIN_BLOCKED` (exact
message), URL unchanged. **Why:** S4.2 (SAFE-0 right after the reload) and the found state read before any toggle;
both signals exist only in a Step 9 build. **Instead of:** a toolbar disarm first (stage0-audit §7). **Revisit if:**
the verifier judges a disarm-based stale check stricter. **By:** Claude

### 2026-10-24 · S4: the found state is the first read after the reload; the restore is judged on read values and the hash
**Decided:** as §4.20's preamble: expected `armed=true evaluate=true count=0 sha256=e3b0c442…b855`; a non-empty
found list is saved outside the repo and deleted after the read-back matches; keys present after the wave are
accepted. **Why:** the pre-Step-9 extension has no state to read; #171, #188. **Instead of:** "keys absent" as the
target (unreachable without `remove`). **Revisit if:** the user wants the keys removed (needs a ruling on #188).
**By:** Claude (step agent's stage-local decision, made concrete here)

### 2026-10-24 · S4: actor transcripts stay outside the repo; only quoted lines are committed, after a count-grep
**Decided:** `s9-actor.ts` keeps transcripts under `%TEMP%\bridge-e2e\s9-actors`; the record quotes tool-result lines
only after `s9.ts scan-file <extract> --mode committed` passes (no token, no non-fixture `://`). SAFE-10's committed
files rule is "0 non-fixture `://`, 0 token"; fixture URLs and the wave's test patterns are allowed there.
**Why:** the brief asks to pre-register how committed transcripts count; a transcript may hold Claude's own
prose and tool lists. **Instead of:** committing whole transcripts as `.txt`. **Revisit if:** the live verifier
needs the whole transcript (it can read it in place). **By:** Claude

### 2026-10-24 · S4: the drift test pins every expected text to its product constant
**Decided:** `recipes/test/s9-rules.test.ts` imports the extension, SDK, MCP and daemon constants and compares
§4.20's copied texts, and the three titles in `s9-win.ps1`. **Why:** a wording change after the rows are committed
then fails `npm test` instead of a live row. **Instead of:** copies only. **Revisit if:** a product module stops
being importable under vitest. **By:** Claude

### 2026-10-24 · S4: SAFE-REL-2, SAFE-ACL-1, SAFE-WAKE, SAFE-7c are pre-registered as not measured
**Decided:** as §3 above. **Why:** each needs a context or a grant outside the wave (code in the worker or a
content-script world, a stopped worker, a gate exemption); the brief allows "not measured" where no clean UIA path
exists. **Instead of:** typing code into the worker's DevTools console (SAFE-REL-2). **Revisit if:** #175's
Revisit-if must be closed (then a dedicated, separately granted probe). **By:** Claude

## 6. Findings (for the runner and the step agent)

- 3 keyboard layouts are installed (`0x04090409, 0x04190419, 0x042c042c`), so SAFE-2's layout clause is
  discriminating — and Alt+Shift may really switch the language; `Restore-S9Layout` puts back only what the wave
  changed.
- `mcp/dist/` is empty in the main tree today: block 2's `npm run build` must run before any actor starts.
- Unmeasured UIA assumptions the smoke will settle: the toolbar button's accessible name is its title (S2b row 8);
  the Extensions menu is a separate top-level window with a per-row pin button named with "Pin"/"Unpin"; HTML ids
  surface as AutomationIds on the options page (true on `chrome://extensions` per the reload script); UIA
  `SetValue` on the textarea and `Toggle` on the checkboxes fire the page's handlers (Save reads the value
  directly, so the saved list does not depend on an `input` event); DevTools exposes console text to UIA.
- `Set-S9Pin` prints the names of our menu row only; `Read-S9Shortcuts` prints only texts of our card that match
  the shortcut vocabulary; `Read-S9OptionsLines` prints invalid lines only with `-ShowInvalid` (used only while the
  list is the wave's own).

## 7. Handoff

Nothing running; no PIDs. The runner starts at the wave sheet's block 0. Unfinished: nothing in the prep scope;
the helpers' first live use is their test.
