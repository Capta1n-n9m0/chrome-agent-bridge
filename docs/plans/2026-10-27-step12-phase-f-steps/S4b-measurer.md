# Step 12 S4b: measurer (CON-KEPT, SWEEP-HELD)

Model: Claude Opus 5.5, medium effort. Run 2026-10-28, 04:20Z to 04:26Z. Chrome **156.0.8078.48**, branded, on a fresh
scratch profile, driven from inside probe P's service worker (P has exactly the product manifest's permissions), by the
Stage 0 m2 method (`s4b-m-setup.txt`). I wrote the pass rules before any run (`s4b-m-passrules.txt`). One section (SH-4) was
appended after SH-1/2/3 ran and before SH-4 ran; no earlier text was edited.

## 1. Verdict

**DONE.** CK-1, CK-2, SH-1, SH-2, SH-3 and SH-4 all hold, 5 of 5. Nothing is NOT MEASURED. DevTools was opened by F12 without
an extra flag beyond the scratch Chrome's `--enable-unsafe-extension-debugging`, which the probes need in order to load (the
same caveat as m2 D3c).

## 2. Outputs

These files are in `docs/plans/2026-10-27-step12-phase-f-steps/`:
- `s4b-m-passrules.txt`: the pass rules.
- `s4b-m-setup.txt`: the launch, the drive, the close and clean-up, and every source (probes, fixture, tools, legs).
- `s4b-m-CK.txt`: CON-KEPT, a summary and the raw leg output.
- `s4b-m-SH.txt`: SWEEP-HELD, one line per repetition as each driver printed it. Tab ids are replaced by N.

### (1) CON-KEPT: one session, `Runtime.enable` → `disable` → `enable` (`s4b-m-CK.txt`)
I ran 5 repetitions, each on a fresh background tab. Before the attach, the page logged `pre-0`..`pre-9` and threw one uncaught
`Error: pre-err`.
- **CK-0 (validity):** R1 delivered 10 logs and 1 `exceptionThrown`, 5 of 5. All 5 repetitions are valid.
- **CK-1, after `Runtime.disable` and 1 s:** R2 re-delivered **every R1 message with the same type, text and timestamp, in
  the same order, 5 of 5. Replay holds.**
- **CK-2, after `Runtime.disable` and 5.1 s:** R3 is the same against R1, **5 of 5. Replay holds.**
- **Messages logged between the reads:** the page logged three messages while Runtime was disabled before R2 and three more
  before R3. **They appear on the next enable**, with their original timestamps:
  - R2 is exactly R1 followed by the three `mid1-*` messages (14 events), 5 of 5;
  - R3 is R1, then `mid1-*`, then `mid2-*` (17 events), 5 of 5.
- **`exceptionId`:** the same (1) in every read. No `exceptionRevoked` arrived.
- **Control R4 (detach, then a new session):** R4 is identical to R3, 5 of 5, which repeats C7's result. No `onDetach` came
  in any repetition.
- **Timing:** `Runtime.enable` answered in 1.0–1.8 ms. Every replayed event arrived **before or with the enable reply**: the
  latest event came at ≤ 0 ms relative to the reply in every read, so all of them fell inside the product's 100 ms settle.

### (2) SWEEP-HELD (`s4b-m-SH.txt`)
In each case another client held the tab and P held no session on it. P read `getTargets` and detached the tab; then I checked
the other client.
- **SH-1: another extension (Q) holds a background tab.**
  - Q's control command answered 2, 5 of 5.
  - P's `getTargets` entry for the tab read `type: "page"`, `attached: **true**`, with **no `extensionId`**. Chrome does not say
    who is attached.
  - P's `detach({tabId})` was **rejected with `Debugger is not attached to the tab with id: N.`**. The exact text was read in
    repetition 6 (run with its spaces kept), and repetitions 1–5 show the same text with the spaces stripped.
  - After P's detach, `getTargets` still read `attached: true`.
  - **Q's next command answered 4 and Q received no `onDetach`, 5 of 5. No side effect.**
- **SH-2: DevTools, opened by F12, holds an active tab.**
  - DevTools frontend targets went 0 → 1 after F12, 5 of 5.
  - `getTargets` read `attached: true` (it read `false` before F12).
  - P's detach gave the same `not attached` text.
  - **The DevTools target was still listed after P's detach (1), 5 of 5. No side effect.**
- **SH-3: a raw CDP client on the scratch port holds a background tab** (`Target.attachToTarget` with flatten).
  - The readings matched SH-1: `attached: true` and the same `not attached` text.
  - **The client's next command answered 6, and no `Target.detachedFromTarget` arrived, 5 of 5.**
- **SH-4: Q holds the tab and P attaches its own session on it too.**
  - P's attach answered **ok** and its command answered 10. Two extensions coexist on one tab in this configuration; only a
    second attach from the *same* extension is refused (m2 D5).
  - P's detach answered **ok**. `getTargets` then read `attached: true`, because Q was still attached.
  - **Q's next command answered 4 and Q received no `onDetach`, 5 of 5.** P's detach ends only P's session.

### What the results mean for the product
- **`consoleMessages` (`extension/src/handlers/console.ts`, `console-messages.ts` `collectConsole`) answers the same on a
  kept tab as on a fresh one.**
  - Each read ends with `Runtime.disable` and the session is kept. The next read's `Runtime.enable` replays the page's whole
    stored set again, after 1 s and after 5.1 s: R2 and R3 equal a new session's R4.
  - Messages logged while Runtime was disabled are included.
  - The `exceptionId`s stay stable, so `reduceConsole`'s revoked-id matching within one read is unaffected.
  - The 100 ms `CONSOLE_SETTLE_MS` covers the replay on a kept session just as on a fresh one.
  - The S4b report's gating finding ("could answer fewer entries on a repeated call") does not occur on these data.
  - One caveat: this was measured with `Runtime.disable` answering ok. If the disable fails, `UseCommands` drops the session,
    and the next read is a fresh session (C7).
- **The sweep (`debugger-keeper.ts` `sweep`, wired in `debugger.ts` `keepSessions`):**
  - `getTargets` reads `attached: true` for a tab held by another extension, by DevTools or by a raw CDP client. It names no
    attacher (`extensionId` is unset), so the sweep's `t.attached && tabId` picks those tabs up, as #335 expected.
  - Its `detach` is then rejected with `Debugger is not attached to the tab with id: N.`, and the other client is unaffected
    (SH-1/2/3, 15 of 15).
  - The sweep ignores **every** rejection (`.then(() => 1, () => 0)`), so this text is covered. It counts 0 for such a tab.
  - On a tab where the extension's own orphaned session sits beside another client's session (SH-4), the detach ends only the
    extension's own session.
  - The same holds for `onDetach`'s follow-up detach. Its comment ("a no-op 'not attached' when the attached client is
    DevTools") is borne out, and the same no-op holds when the attached client is another extension or a CDP client.
  - `debugger-errors.ts:61` would map that text to the user-cancel code if it ever surfaced through `withDebugger`. The sweep
    never surfaces it.

## 3. Verifier verdict
None; a measurer has no verifier.

## 4. Deviations
- **SH-3 and SH-4 were added.** SH-3 is a CDP-port client standing in for a DevTools-like client whose next command can be
  sent. SH-4 is the sweep's own-orphan case on a shared tab; its rule was appended before it ran.
- **SH-1's driver stripped the spaces from its output.** One more repetition was run unstripped as a new row; repetitions 1–5
  stand as recorded.
- **`CK.js`'s `CK0.exc` counter had a filter bug and reads 0.** CK-0 was judged from the ids list, where the exception
  appears in every R1 (noted in `s4b-m-CK.txt`).

## 5. Proposed decisions

### 2026-10-28 · Step 12: a kept session's console read needs no change; CON-KEPT closes the S4b gating finding
**Decided:** `collectConsole` stays as it is (enable, settle 100 ms, disable) on a kept session. The phase doc's 0.6 "answers
do not change" holds for `browser_console_messages`.
**Why:** CK-1 and CK-2 held 5 of 5. R2 and R3 were supersets of R1 in order, and equal to a new session's read (R4). Every
event arrived before the enable reply.
**Instead of:** forcing a fresh session per console read.
**Revisit if:** a live row (Run 19) shows a repeated `browser_console_messages` on a kept tab answering fewer entries.
**By:** Claude (proposed)

### 2026-10-28 · Step 12: the sweep's detach of a tab another client holds is harmless; #335's measurement is met
**Decided:** keep the start-up sweep as built: no `extensionId` filter, all failures ignored.
**Why:** the other client survived in SH-1, SH-2 and SH-3, 15 of 15, with the rejection `Debugger is not attached to the tab
with id: N.`. SH-4 shows that the extension's own detach ends only its own session on a shared tab.
**Instead of:** filtering targets, which is impossible because `extensionId` is unset for an attached tab.
**Revisit if:** a live run without `--enable-unsafe-extension-debugging` (the real profile) shows a different text or a side
effect.
**By:** Claude (proposed)

## 6. Findings (each measured on Chrome 156.0.8078.48, scratch profile, `--enable-unsafe-extension-debugging`, 2026-10-28)
1. **A second `Runtime.enable` in the same session replays the whole stored set**, after 1 s and after 5.1 s: the same
   timestamps and `exceptionId`, plus the messages logged while Runtime was disabled (CK). This extends C7. Candidate for
   `extension/CLAUDE.md`.
2. **`chrome.debugger.detach` of a tab another client holds** (an extension, DevTools or a CDP client) is rejected with
   `Debugger is not attached to the tab with id: N.` and leaves that client's session working (SH-1/2/3).
3. **`getTargets` reads `attached: true` for any client's session and has no `extensionId` for it**, so the attacher cannot be
   told apart (SH-1/2/3).
4. **Two different extensions can attach to one tab at once.** Each one's detach ends only its own session (SH-4). This
   contradicts the "one debugger per tab" bullet in `extension/CLAUDE.md` for this configuration, as m2 D3c did for DevTools.
   The no-flag case is still unmeasured.

## 7. Handoff
- The scratch Chrome was closed by `Browser.close` over its pipe (exit code 0). The fixture server (pid 34848) was stopped by
  its PID.
- 0 processes remain whose CommandLine contains the scratch root or the server. Ports 18530–18539 have no listener, and 9234
  was never touched. No daemon was run.
- The scratch root was checked for reparse points (none) and deleted (`test -e` → deleted).
- The user's Chrome, profile, tabs and windows were not touched. SH-2's F12 went only to the scratch browser's window, by PID.
- Not committed (per the brief). Nothing needs the user's keyboard.
