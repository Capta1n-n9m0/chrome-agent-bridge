# Step 12 Stage 0: measurer 2 (D, E, G1, G2 Chrome facts)

Model: Claude Opus 5.5, medium effort. Run 2026-10-27, 14:07Z to 14:35Z. Chrome **156.0.8078.48**, branded, on a scratch profile
(`stage0-m2-setup.txt`), driven through probe P, which has exactly the product manifest's permissions, from inside its service worker.
I wrote the pass rules before any run (`stage0-m2-passrules.txt`). Two sections were appended later on the step agent's
instruction (E7/D4c/D5, then E8). Each was appended before its legs ran, and no earlier text was edited.

## 1. Verdict

**DONE.** Every fact has an answer. One control is NOT MEASURED (D3c without the unsafe-debugging flag; see D3). Three
readings contradict the phase doc or a package `CLAUDE.md` (D3c, D4c, D5). They are listed under Findings and Proposed decisions.

## 2. Outputs

These files are in `docs/plans/2026-10-27-step12-phase-f-steps/`:
- `stage0-m2-passrules.txt`: the pass rules.
- `stage0-m2-setup.txt`: the launch, the drive and the clean-up.
- `stage0-m2-src.txt`: the probes, fixture, tools and every leg file.
- `stage0-m2-D.txt`, `stage0-m2-E.txt`, `stage0-m2-G1.txt`, `stage0-m2-G2.txt`: the evidence, as each leg printed it.

All times below are in ms.

### D: a kept debugger session
- **D1, attach cost (n=20 each, background tab).** Attach plus first `Runtime.evaluate`: median **0.8**, max 2.8. The attach
  alone: median 0.4. A command on a kept session: median **0.6**, max 0.7. The attach costs about **0.2 ms**, which is negligible.
  The only measured gain from D is the banner, not time.
- **D2, the banner with a kept session (3 repetitions, UIA samples continuous, median gap 36 ms).** The banner is **shown
  continuously while attached**: 0 negative samples in 791, 795 and 791 samples. It appeared 71–111 ms after the attach. After
  the detach, it went between **5.02–5.06 s** (the last positive sample) and **5.14–5.16 s** (the first negative sample), in all 3
  repetitions, and never came back. With 0.6's 5 s idle bound, the banner therefore stays up about **10 s after a tab's last
  call** (5 s idle plus about 5.1 s linger).
- **D3, the `onDetach` reasons.**
  - (a) Tab closed: `target_closed`, 3 of 3, 1.2–1.4 ms after `tabs.remove`.
  - (b) The banner's Cancel, pressed by UIA Invoke: `canceled_by_user`, 3 of 3, about 15 ms after the press. The kept session's
    next `sendCommand` then answers `Debugger is not attached to the tab with id: N.` A new attach answers ok.
  - (c) **DevTools coexists with the extension session.** I sent F12 to the scratch window, and one DevTools frontend target
    appeared (0 before it). Then:
    - no `onDetach` came within 10 s;
    - the kept session's command answered ok;
    - after a detach, a new attach answered **ok** while DevTools was still open;
    - in (c'), with DevTools open first, attach plus `1+1` answered `2`;
    - after DevTools was closed, attach answered ok.
  - `replaced_with_devtools` was not produced by anything I did. The scratch Chrome ran with `--enable-unsafe-extension-debugging`.
    The control without that flag is **NOT MEASURED**: a CDP-loaded extension is not saved in the profile, and `--load-extension`
    is ignored on branded 156 (`stage0-m2-D.txt`). The result is consistent with Run 16's UP-DEVT, where the upload succeeded
    with DevTools supposedly open (S5-liveB.md, NOT MEASURED there).
- **D4, does a kept session survive?**
  - Same-origin navigation, then cross-origin to b.test: no `onDetach`, and each command answered ok on the new document
    (`port=18511`, then `18512`).
  - **A worker restart does not end the session.** I stopped the worker with CDP `ServiceWorker.stopWorker`, through a session on
    P's own page; the worker target disappeared. In the new worker:
    - `getTargets` showed `attached: true`;
    - a `sendCommand` without an attach answered **ok**;
    - an attach answered `Another debugger is already attached to the tab with id: N.`;
    - no `onDetach` fired;
    - the banner was positive in 333 of 333 samples across the stop;
    - a detach from the new worker answered ok.
  - An earlier attempt with the same worker (the stop tool had a bug and stopped nothing) gave the same answers. It is kept as
    a control.
- **D5, a second attach from the same extension:** `Another debugger is already attached to the tab with id: N.` (3 of 3).
  The kept session went on answering ok.

### E: the native file chooser (X in the background unless stated)
- **E1:** `Page.setInterceptFileChooserDialog {enabled:true}` answered `{}`, with and without `Page.enable`.
- **E2 and E7:** clicked by `Runtime.evaluate {userGesture:true}`.
  - With `Page.enable`: `Page.fileChooserOpened` arrived **5 of 5**, 0.4–3.4 ms after the click, on the same session. It carried
    `mode: selectSingle`, a `backendNodeId` and a `frameId`.
  - **Without `Page.enable`: 0 of 5**, so `Page.enable` is **needed**. In those samples no dialog showed and the page got
    nothing.
  - `showOpenFilePicker`: the event arrived 3 of 3 **without** a `backendNodeId`. The page's promise rejected with `AbortError`.
  - **E does not depend on D**: one call's own session receives the event.
- **E3:** `DOM.setFileInputFiles {files, backendNodeId}` answered ok. In E3r2 (the input cleared first) the page got the file
  **5 of 5**: change +1, `s12-m2-fixture.txt`, 66 bytes. In the first run (E123) only 1 of 5 passed the rule: samples 2–5 set the
  same file again, Chrome fired no `change`, and that run is recorded as it is.
- **E4 (r2, X active, so that a dialog can show):**
  - (i) Interception switched off, then a click: Chrome's own **Open dialog, 2 of 2** (closed by UIA).
  - (ii) Interception on, detach, a new session without enabling it, then a click: the native dialog, **2 of 2**. Interception
    ends with the session.
  - Interception never caused a dialog. In E48r2, 13 dialogs appeared, one per non-intercepted click, and 0 for the 8
    intercepted clicks.
- **The background-tab fact:** with no interception, Chrome **cancels a background tab's chooser at once**. The page's `cancel`
  event came 0.7 ms after the click, and no dialog appeared (detector on all scratch chrome.exe processes).
- **E5, no userGesture:** 0 of 3 events. The handler ran with `userActivation.isActive=false`.
- **E6, a trusted `Input.dispatchMouseEvent` on a background tab:** both replies ok, **0 of 3 clicks reached the page**, and no
  event.
- **E8, cancelling an intercepted chooser:**
  - (a) `setFileInputFiles {files:[]}` answered ok.
  - (b) Interception switched off without an answer.
  - (c) Detach without an answer.
  - For each way, n=2: no `cancel` event, no `change` event, and the input was unchanged. A preloaded input **kept its file**
    under (a), so `files:[]` does not clear it.
  - The next ordinary click opened the native dialog, 8 of 8 (r2). The chooser is free again after every way.
  - Mode: `selectMultiple` for `<input multiple>` (2 of 2) and `selectSingle` (2 of 2).

### G1: the real opener (5 samples per kind × 3 kinds per leg)
- **G1-1:** `extension/manifest.json` has **no `webNavigation`**.
- **G1-2, opener in the background.** The kinds were a `window.open` click, a `target=_blank` link click (both userGesture
  eval) and an isolated-world `el.click()` on the link.
  - `tabs.onCreated` and the later `tabs.get` gave `openerTabId` = **the active tab H, 15 of 15**, in both P and W.
  - `webNavigation.onCreatedNavigationTarget.sourceTabId` = **the real opener O, 15 of 15**.
  - With the opener in front, all sources named O, 15 of 15.
- **G1-3, without `webNavigation`:** `chrome.webNavigation` is `undefined` in P.
  - `Target.setDiscoverTargets` through `chrome.debugger` answered `Not allowed`, and no `Target.*` event arrived.
  - `Page.windowOpen` arrived on O's session 30 of 30 (url and userGesture), but **it carries no tab id**. It also needs a
    debugger session, with its banner, on the opener before the click.
  - **No source the current manifest allows names the opener in a form that can be joined to the new tab.**

### G2: the settle pause (`stage0-m2-G2.txt`)
- **(a) n=20.** From `tabs.update {active}` plus `windows.update {focused}` resolving (about 10 ms): `visibilitychange`
  came at median **22.2**, max **23.8**. The window's `focus` came *before* the calls resolved (median −1.5, 20 of 20).
  `hasFocus()` was true in 20 of 20.
- **(b) n=20 each.** Mouse: the handler ran *before* the reply (median −0.3); the next rAF came at median **6.8**, max **9.6**.
  Key: keydown −0.7, input −0.35, rAF −0.2, all before the `keyDown` reply returned.
- **(c) 150 samples:** **0 lost, 0 misrouted** at every d ∈ {0, 50, 100, 250, 500}. That is c1 (switch after the last reply,
  n=20 per d) and c2 (switch from the first send, mid-typing, n=10 per d). In c2 at d=0, the keys sent after the switch still
  landed in T, which had gone to the background.
- **The bound, derived by the pre-registered rule:** the smallest d with no loss is 0, and the max of (b)'s rAF is 9.6 ms, so
  the data support a pause of about **10 ms**. **500 ms is supported, not contradicted, with about 490 ms of margin.** These
  data do not require it.
- The measured hazard is **before** the input, not after it. Mouse input to a tab that is not in front is lost (E6, 0 of 3), so
  the lock must cover the focus through the input. Focus settles within 24 ms of the focus calls (a).

## 3. Verifier verdict
None; a measurer has no verifier.

## 4. Deviations
- The re-run rows E3r2 and E48r2 are new labelled rows (G-1); E123's and E48's results stand as recorded.
- The D4c stop was attempted twice. The first attempt failed on a tool bug, and its readings are kept as a control.
- The no-flag control for D3c was attempted and is NOT MEASURED.
- I added an isolated-world click kind to G1 (the product's default click path, as R15-POP-2 used).

## 5. Proposed decisions

### 2026-10-27 · Step 12: a kept session survives a worker restart, so the keeper sweeps at start
**Decided:** at worker start, the extension detaches every tab whose `chrome.debugger.getTargets()` entry is `attached`
and was attached by this extension. A detach of a tab the extension does not hold fails harmlessly. The phase doc's 0.6
line "a worker restart (sessions do not survive it)" is amended.
**Why:** D4c. The session, its banner and its ability to answer commands outlived `ServiceWorker.stopWorker`. The new worker
has no record of it, so without a sweep the banner stays up and the session is orphaned.
**Instead of:** trusting the restart to end it.
**Revisit if:** a live run shows a culled worker (not one stopped by CDP) losing the session.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: "Another debugger is already attached" is not proof of DevTools on Chrome 156
**Decided:** the keeper never attaches twice. A tab it already holds is reused, and a failed attach on a held tab is the
keeper's own state, never `DEBUGGER_DEVTOOLS`. The `extension/CLAUDE.md` gotcha "with DevTools open, attach throws Another
debugger" is re-measured in the real profile at Run 19 before it is amended. For user review: the `DEBUGGER_DEVTOOLS`
message wording.
**Why:** D5 (same-extension double attach gives that exact text) and D3c (DevTools coexisted; the scratch run had the unsafe
flag, and the no-flag control was not measurable).
**Instead of:** amending the gotcha from a flagged scratch Chrome.
**Revisit if:** Run 19 shows DevTools refusing the attach.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: E on one call's own session, with `Page.enable`
**Decided:** E as in 0.7 on its own session (not on D): `Page.enable` before the interception. A `fileChooserOpened` with
no `backendNodeId` (`showOpenFilePicker`) is refused, because there is no input to set. On every refusal path the
interception is switched off or the session detached; both free the chooser (E8). `files: []` is not used as a "cancel":
it leaves a preloaded input's files.
**Why:** E2, E7, E8, E4(ii).
**Instead of:** depending on D.
**Revisit if:** a live row shows the event missing on the product's session.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: G1 stays a documented limit until G12-2
**Decided:** the phase doc's fallback. `sourceTabId` names the real opener (15 of 15), but it needs the `webNavigation`
permission, which the manifest lacks. G1 goes to the user as G12-2: add `webNavigation` for (b), or keep (a).
`Page.windowOpen` is not used: it has no tab id and needs a debugger session, with its banner, on every held tab.
**Why:** G1-1 to G1-3; #326.
**Instead of:** a URL-and-time join heuristic.
**Revisit if:** the user grants the permission.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: G2 keeps the 500 ms pause; the lock covers the focus through the input
**Decided:** keep #321's 500 ms (it costs only time). The data support it, and they show the risk is the gap between focus
and input (E6), which the lock from focus through input closes. Either mechanism (i) or (ii) works on these data: focus
settles within 24 ms.
**Why:** G2 a–c.
**Instead of:** shortening it to about 50 ms now.
**Revisit if:** latency matters, or Run 19 shows input lost inside 500 ms.
**By:** Claude (proposed)

## 6. Findings (each a candidate gotcha for a package `CLAUDE.md`; all Chrome 156.0.8078.48, scratch profile, 2026-10-27)
1. **A chrome.debugger session survives a service-worker stop.** The new worker can `sendCommand` without an attach, and an
   attach gets "Another debugger…" (D4c). This contradicts phase doc 0.6.
2. **Same-extension double attach** gives "Another debugger is already attached to the tab with id: N.", which
   `debugger-errors.ts:48` maps to `DEBUGGER_DEVTOOLS` (D5).
3. **DevTools opened by F12 coexisted with an extension session**: no `onDetach`, and attach was ok both ways (D3c, with the
   unsafe flag). This contradicts `extension/CLAUDE.md`'s "one debugger per tab" bullet for this configuration.
4. **The banner shows from attach (about 0.1 s) to about 5.1 s after detach, without a gap** (D2).
5. **Chrome cancels a background tab's file chooser at once** (`cancel` event, no dialog). The native dialog runs in a
   child chrome.exe, not the browser process.
6. **`Page.fileChooserOpened` needs `Page.enable`.** Chrome fires no `change` when the same file is set again.

## 7. Handoff
- No process is left: the count of chrome, node, python and timeout processes with `s12-stage0-m2` in their CommandLine was 0
  after the servers were stopped by PID.
- Ports 18510–18519 are free, and 9234 was never touched.
- The scratch root was checked for reparse points (none) and deleted (`test -e` → deleted).
- Measurer 1's Chrome was never touched; it was headless or absent at every focus guard.
- Nothing needs the user's keyboard.
