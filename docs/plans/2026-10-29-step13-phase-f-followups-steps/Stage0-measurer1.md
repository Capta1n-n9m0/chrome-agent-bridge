# Step 13 Stage 0: measurer 1 (G1 event order, and the `webNavigation` reload)

Measured in a scratch branded Chrome 156.0.8078.48 on its own temporary profiles, `--headless=new`, pipe only, probes loaded
by CDP `Extensions.loadUnpacked` (#294, #297). Pass rules were written before the first run, and dated addenda were added
before each later leg (`stage0-m1-passrules.txt`).

## 1. Verdict

**DONE.** Every fact in the brief has a measured value, or is NOT MEASURED with the reason given. G1-order: 30 popups with a
foreground opener and 30 with a background opener, all valid. G1-reload: both reload paths, with the flag and without it.

## 2. Outputs

- `stage0-m1-passrules.txt`: R1–R9, written before any run, plus three dated addenda.
- `stage0-m1-setup.txt`: launch, PIDs, how each Chrome ended, clean-up.
- `stage0-m1-src.txt`: probe, fixture and drivers.
- `stage0-m1-G1.txt`: the summary from `node tools/summ.mjs runs/g1-run1/g1.json` and every sample.
- `stage0-m1-reload.txt`: every reading.
- No commit, no product code, test count unchanged.

### Facts

| Fact | Value | How | Evidence |
|---|---|---|---|
| Order, foreground opener | **C first 30/30**: tabs.onCreated (C) before webNavigation.onCreatedNavigationTarget (N) | Both listeners in the probe's worker; worker dispatch sequence number | G1.txt, leg fg |
| Order, background opener | **C first 30/30** | same | G1.txt, leg bg |
| Spread t(N) − t(C) | fg 0.1–0.6 ms (median 0.3); bg 0.0–0.4 ms (median 0.3); **D = 0.6 ms** over 60 | Worker clock `timeOrigin + now()` | G1.txt summary |
| A popup with one event missing | **0 of 60** | Waited up to 3000 ms after the trigger, then 300 ms more | G1.txt |
| `sourceTabId` names the real opener | **60/60** (fg 30, bg 30); per kind 5/5 each; popup of a popup names P1 10/10 | `N.sourceTabId` against the opener's tab id | G1.txt per kind |
| `tabs.onCreated` `openerTabId`, fg | The opener, 30/30 | `C.openerTabId`; a later `tabs.get` agrees 30/30 | G1.txt |
| `tabs.onCreated` `openerTabId`, bg | **The active tab H, 25/30**; the real opener only for `window.open(…, "popup,…")` (a new window), 5/5 | same | G1.txt bg per kind |
| Cases covered | `window.open` with and without `noopener`, popup-window features, `target=_blank` link with and without `rel=noopener`, popup of a popup: identical results | 5 samples per kind per leg | G1.txt |
| Blocked popup (no gesture) | 6/6: no tab, and **neither C nor N** | `window.open` with no `userGesture` | G1.txt `blk` |
| C after the trigger | 6.9–40.4 ms | Worker clock from arming to C | G1.txt |
| Warning list, product vs + webNavigation | **Unchanged**: both are ["Access the page debugger backend", "Read and change all your data on all websites"] | M's `management.getPermissionWarningsByManifest` on the product manifest text at ff121a4, with and without `webNavigation` | reload.txt |
| What chrome://extensions shows after the + webNavigation reload | Same two permission messages, state ENABLED, no runtime or install warnings, card text unchanged (name, "Unpacked extension", ID, "Inspect views service worker") | `developerPrivate.getExtensionInfo` and the card's text, read from a chrome://extensions page | reload.txt run 2, 3b, 3d |
| Stays enabled, flag, path A (`chrome.runtime.reload()`) | **YES** (2 runs): enabled, `disabledReason` null, no `disableReasons` flag, no new page target; `webNavigation` granted and `chrome.webNavigation` is an object in the worker | Control without a manifest change also YES (R7 discriminating) | reload.txt run 1, run 2 |
| Stays enabled, flag, path B (the reload button) | **YES** (2 runs), same readings | `#dev-reload-button` clicked in the probe's card, developer mode on | reload.txt run 1, run 2 |
| Stays enabled, **no flag**, path B′ (button) | **YES**: Fb_wn ENABLED, no reason, `webNavigation` granted; control Fb_ctrl YES | Same profile relaunched without `--enable-unsafe-extension-debugging` | reload.txt 3b |
| Stays enabled, **no flag**, path A′ (`runtime.reload()`) | **YES**: Fa_ctrl gains `webNavigation`, ENABLED, no reason, `chrome.webNavigation` object; control (3c) YES | Observer M messages the probe, which calls `chrome.runtime.reload()` | reload.txt 3c, 3d |
| Events of one reload | `onDisabled` (reason "unknown") → `onEnabled` → `onInstalled`, within about 15 ms, the same with and without a permission change | M's management listeners | reload.txt |
| A changed manifest at browser start (observed, not a pre-registered row) | Picked up; ENABLED, no reason | Fa_wn's manifest written in 3b, read at 3c's relaunch | reload.txt 3c note |
| A visible prompt | Not observable headless; **no permissions-increase disable occurred**, and that disable is what a re-enable prompt follows (an inference) | — | — |

## 3. Verifier verdict

None (measurer leaf).

## 4. Deviations

- Headless for every leg, as the brief allows. A windowed control is NOT MEASURED: the foreground/background split, the
  focus, and a native prompt dialog are not observed in a visible window.
- The flag and the CDP load may differ from a user-loaded unpacked extension. The flagless control used probes first
  installed by CDP with the flag, which persisted into the profile (`installType: development`, location UNPACKED).
  A probe installed by the user's "Load unpacked" file picker is NOT MEASURED.
- Legs that failed or did not count, each recorded and each re-run preceded by an addendum: the smoke run's trigger bug;
  run 1's card read; run 2's flagless phase (no probes); run 3 (void); run 3b's path A′ (its trigger edit silently missed
  because a Bash heredoc dropped backslashes).
- Run 3's Chrome was not closed by `Browser.close`: it ended when I stopped my own driver (PID 14224) and its pipe closed
  (setup.txt).

## 5. Proposed decisions

### 2026-10-29 · Step 13 Stage 0: G1 joins the opener in one field, with a 250 ms bound
**Decided:** `tabCreated` gains an optional `sourceTabId` (0.2, "one field"). The extension holds a new tab's `tabCreated`
until that tab's `onCreatedNavigationTarget` arrives, or for at most **250 ms**, then sends it without `sourceTabId`. No
`tabOpener` late event. The join accepts N before C, at the cost of one map.
**Why:** C came first in 60 of 60 popups. N followed within 0.6 ms at most, and no popup missed an event, so by R4 the
bound is the smallest of 250/500/1000 ms that is at least 4 × D. A blocked popup sends neither event, so nothing waits on it.
**Instead of:** a late `tabOpener` event, which would mean a second daemon path and a lease granted after the fact.
**Revisit if:** Run 20 (windowed, the real worker under load) sees a popup's `tabCreated` without `sourceTabId`, or a tab
that is not a popup is delayed visibly.
**By:** Claude (proposed)

### 2026-10-29 · Step 13 Stage 0: adding `webNavigation` changes nothing the human sees at reload
**Decided:** S1's manifest change needs only the usual reload (`recipes/reload-extension.ps1`). It is not a G13-2 matter:
the warning list and the chrome://extensions permission list are unchanged, and the extension stays enabled with no reason
on both reload paths, with the flag and without it.
**Why:** the reload rows in the facts table.
**Revisit if:** after S1, the real extension's card in the user's Chrome shows a disabled state or a new permission line
(the reload script's check would see the first).
**By:** Claude (proposed)

## 6. Findings (each a candidate gotcha; Chrome 156.0.8078.48, scratch profile, headless, 2026-10-29)

1. **Failed pre-registered checks:** none (R6 held on every discriminating row; every R7 control stayed enabled).
2. **`recipes/CLAUDE.md`'s scratch-Chrome bullet is contradicted here.** It says "`chrome.runtime.reload()` … leaves it
   disabled until `management.setEnabled`". In this run a CDP-loaded probe stayed ENABLED after `chrome.runtime.reload()`
   in run 1 and run 2, with the flag. File-access was never toggled here; the bullet's other trigger is NOT MEASURED.
   Candidate: narrow that bullet.
3. **A CDP-loaded unpacked extension persists into the profile only after it has been reloaded once.** In run 2's flagless
   relaunch, the four reloaded probes were listed; the never-reloaded ones, and M, were gone. This is consistent with
   Step 12 m2's "not saved". It gives later Stage 0s a flagless control. Without the flag, CDP still reached the persisted
   observer's worker (3b–3d).
4. **For a background opener, `tabs.onCreated.openerTabId` is the active tab** (25/30). The exception is a popup *window*
   (`window.open` with features): there it names the real opener (5/5). `sourceTabId` is right in every case. This
   matches #337's 15/15 and adds the popup-window exception.
5. **An unpacked extension picks up a changed manifest at browser start** and stays enabled (3c, observed).
**Blind spots not measured:** a worker asleep or restarting between C and N; a busy worker (the product's also runs
webRequest listeners); a source tab closed before the join; windowed Chrome; a popup from a cross-origin iframe (all
sources here were frame 0).

## 7. Handoff

- **Processes:** none running. Every PID I started was checked: Chrome 33248, 8448, 7504, 24036, 5292, 13744, 36828,
  36468, 20092, 25712, 18328, 29824; node 14224; server 29988. 0 alive; 0 processes with the scratch folder in the
  CommandLine; no socket on :8080.
- **Clean-up:** the scratch profiles are deleted; no reparse points were found first.
- **Not touched:** measurer 2's processes and ports, the user's Chrome, the daemon, port 9234.
- **S1 needs:** the 250 ms bound and join rule above; `stage0-m1-G1.txt` for test fixtures. **Run 20:** the windowed
  check of the order. Nothing needs the user's keyboard.
