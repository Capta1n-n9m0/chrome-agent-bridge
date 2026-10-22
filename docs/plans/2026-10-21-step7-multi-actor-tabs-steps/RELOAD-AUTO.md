# RELOAD-AUTO — reload the extension by UI automation (step report)

2026-10-23, step agent Opus 5.5, base HEAD b4ea752. Authority: decisions.md · 2026-10-23 · The driver
may reload the extension by UI automation, and restart Chrome with flags for the background-input test (#64).

## Verdict

**DONE — the reload works and is verified.** `recipes/reload-extension.ps1` reloaded Chrome Agent
Bridge in the user's running Chrome (Chrome 156.0.8078.48, Windows 11) through Windows UI Automation,
in a window it opened and closed itself. The proof was the same in each of the step agent's run and
the verifier's two rounds: `t5.ts check` printed CHECK PASS, and the T5b probe got `OFFSCREEN` in 2–3 ms.
Verifier: **PASS-with-notes** (0 CRITICAL, 0 MAJOR; 4 MINOR fixed in fix round 1; 3 NIT, of which R1
is fixed after the re-check). Test count: unchanged and not re-measured (965 / 59 files at T5b); no
package code changed, the only code is a recipe script.

## Outputs

- `recipes/reload-extension.ps1` (new): finds chrome.exe; refuses if Chrome is not running; opens
  one window (`--new-window about:blank`); confirms its address bar reads `about:blank`; navigates
  it to `chrome://extensions` through that window's own omnibox (UIA `SetValue` + one Enter, sent
  only while that window is in front and its omnibox has focus); finds the card by name **and** by the
  ID derived from the path of `extension/`; invokes the card's one `dev-reload-button` (raw parent
  `itemsList`); verifies by UIA (the card's "Inspect views" changes) and by a new
  `extension resync` line in daemon.log stamped at or after the press; closes its window. Exit codes:
  0 OK, 2 nothing pressed, 3 not verified, 4 window left open, 5 dry run, 1 script error.
- `docs/e2e-test-plan.md` §1 item 9, "Reloading the extension by UI automation".
- `docs/setup.md` §4: a pointer paragraph.
- Ledger `RELOAD-AUTO.ledger.md`, verifier `RELOAD-AUTO-verifier.md`.

## Measurements (this run)

Pre-state (22:31Z): no daemon was running. `daemon/dist/index.js` sha256 was `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974`.
The `extension/dist` files were last written at 2026-10-22T21:44:20Z (the T5b build). The user's last
reload was at 19:36Z, before T5b, so Chrome was running pre-T5b code. All of these were unchanged at the end.

| UTC | What | Result |
|---|---|---|
| 22:32:53 | `t5.ts check` (pre, spawns daemon pid 26572) | CHECK PASS (not discriminating, as §4.15 says) |
| — | `chrome.exe --new-window chrome://extensions` | opens a **New Tab** page: Chrome refuses chrome:// from the command line |
| 22:34:00 | exploratory press, by hand-run UIA, in own window | worker `service worker (Inactive)` at +100 ms, back by +400 ms; daemon.log `extension resync: 3 tabs, 0 gone` in the same second |
| 22:34:36 | T5b probe | `OFFSCREEN … in 3 ms` → PROBE PASS (the reload took; pre-T5b code hangs to TIMEOUT, Run 8 SCREEN-2) |
| 22:37:28/35 | script with a wrong `-ExtensionId` (dry, then real) | exit 2, `with ID aaaa…: 0 (need exactly 1) - nothing pressed`, window closed |
| 22:37:53 | **script, real** | exit 0; `RELOAD OK`; resync line 22:37:53Z; own window closed |
| 22:37:58 / 22:38:01 | `t5.ts check`; T5b probe | CHECK PASS; PROBE PASS (3 ms) |
| 22:42:18, 22:42:24 | verifier: two real runs (its wrapper dropped negative-check parameters; both hit the right button) | exit 0, resync lines; check PASS, probe PASS |
| 22:48:50 | verifier fix-round re-check: one real run | exit 0, resync 22:48:50Z; check PASS; probe PASS (2 ms) |

The T5b probe (scratchpad `t5b-probe.mts`, not committed: it is specific to this build) opens one
background tab in the current window (the driver's fixture window) with `newTab {active:false}`. It
calls `screenshot {mode:"cdp"}` on that tab with a 5 s timeout, requires `OFFSCREEN` in under 1000 ms,
and closes the tab. It is not R9-SCREEN-2: no capture loop, no banner judgement, no row text.

## Deviations

1. The extension was reloaded **5 times**, not once: my exploratory press by hand, my scripted run,
   the verifier's two runs in round 0 (one was meant as a negative check) and one run in round 1.
   Every press was the Chrome Agent Bridge reload button, through UIA. Each one empties
   `storage.session` (the network log), which nothing in this stage needed.
2. I committed the stage myself rather than through a builder (common.md COMMIT). The commit covers
   docs plus one recipe script, and I read the whole diff myself.
3. NIT R1 (the verifier's re-check) was fixed after the re-check: with no address bar, the window is
   no longer closed. That was a one-line change. I ran it once as a dry run (exit 5); the path itself
   cannot be triggered live.

## Proposed decisions

- **2026-10-23 · The driver reloads the extension with `recipes/reload-extension.ps1`.** *Decided:* any
  later G7-type reload (Run 9, the BG experiment, Step 8) uses the script, followed by the wave's stale
  check. A build-specific discriminator follows when the wave's own check cannot tell builds apart.
  *Why:* it was measured working three times by two agents, and every doubt presses nothing.
  *Instead of:* asking the user. *Revisit if:* the script's output ever shows a press other than
  `dev-reload-button`, or Chrome's extensions page changes its AutomationIds. *By:* Claude
  (under #64).

## Findings

- F1: Chrome refuses `chrome://` URLs passed on the command line and opens a New Tab page instead.
  Navigating through the window's own omnibox works.
- F2: Chrome exposes the extensions page to UIA with no flag; the tree was built on the first request.
  Cards are flattened into control-view sibling runs, and `itemsList` shows only in the raw view.
- F3: The browser toolbar's Reload is also a `Button 'Reload'` (AutomationId `view_1003`), so matching
  on the name "Reload" alone would be dangerous. The script matches the AutomationId within the card.
- F4: An unpacked extension's ID is the sha256 of its absolute path in UTF-16LE: the first 16 bytes,
  each nibble written as a letter from a to p (`cpnemjbgecfbeicldpaaegbhjgjgjfep`).
- F5: An `about:blank` page has no UIA document element. The omnibox reads `about:blank`.
- F6: A daemon running during the press gives the best proof. The `extension resync` line arrived
  within the same second every time (5 of 5).
- Future (not built): a bridge method calling `chrome.runtime.reload()` from the service worker would
  make the reload a single call, but only for an extension that already has the method.

Candidate CLAUDE.md runtime gotcha (measured facts only):
> **The driver can reload the extension by UI automation** (`recipes/reload-extension.ps1`,
> RELOAD-AUTO 2026-10-23). Chrome refuses a `chrome://` URL given on the command line (it opens a New
> Tab page), so the script types `chrome://extensions` into its own window's omnibox. On that page,
> Chrome 156's UIA tree flattens each card into siblings that start at AutomationId `name`. The card's
> reload is AutomationId `dev-reload-button`. The toolbar's Reload is also named "Reload", so never
> match by name. An unpacked extension's ID is sha256(absolute path as UTF-16LE), with the first 16
> bytes written as letters a to p. Proof of a reload: a new `extension resync` line in daemon.log in
> the same second. Proof of the build: the wave's stale check.

## Handoff

Nothing left running from this stage. The fixture server (pid 9924) was stopped after
`Test-SafeToKill` printed `safe`. Window W0 (4787250) was closed, and every window the scripts opened
was closed. The user's window 658614 was never touched. Daemon pid 26572 (T5b build) is left to idle
out (10 min, no clients). Next: Run 9 (T5 part 2) can start with the script in place of the [USER]
reload.
