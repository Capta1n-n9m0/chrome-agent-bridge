# S4 investigation — Run 17's `back` refusals and RD-DISARM (investigator report)

Investigator: Claude Opus 5.5, medium effort, a leaf (read and measure). Nothing in the repo's code, recipes or sheet was
edited; nothing of the user's Chrome, tabs or profile was touched; the bridge was not run. Evidence beside this file:
`stage4-back-a.txt`, `stage4-back-b.txt`, `stage4-back-c.txt` (results), `stage4-back-src.txt` (the probe's source).

## 1. Verdict
**DONE.** (A) The `back` refusal **predates Step 11b**: it is Chrome's own answer for a history the bridge builds, and
it does not depend on the Step 11b code or permission. (B) RD-DISARM's FAIL is **a helper and sheet timing fact, not a
product defect**: the helper re-armed 1.2 s before the reply, so the post-check correctly saw an armed state.

## 2. Outputs
The four evidence files above, and this report. No commit (brief).

## 3. (A) The `back` refusal

### A1. By reading: Step 11b cannot change what `goBack` is called with, or when, on an empty list
- `git diff c9db926^ HEAD -- extension/src/handlers/history.ts`: old and new both run `targetTab` → `call?.effect()` →
  `chrome.tabs.goBack(id)`, same order, same id. The only addition, `settleWait`, is armed only when `holdsRules()` is
  true and is awaited after `goBack`.
- With an empty list, `effect()`'s `dnr.install` makes no API call (`safety-dnr-keeper.ts:27`, F15) and `holding()` is
  false (`:87`). The post-check runs after `goBack` and cannot change Chrome's rejection, which reaches the wire
  unchanged as `INTERNAL` (5–6 ms in Run 17).

### A2. Earlier live runs: none recorded a bridge `back`
Grep of `docs/e2e-test-plan.md`: the one pre-Step-11b row is §4.6 **HIST-1** ("Navigate A → B, then `browser_back`…").
Its box in the checklist (`e2e-test-plan.md:1678`, `HIST-1 [ ]`) is empty, and no Results table or run record anywhere
under `docs/` names it (grep `HIST-1`, `goBack`, `browser_back`). So no live run ever measured a bridge `back`, on any
kind of tab. RD-BACK-EMPTY's expected `ok`, "as before Step 11b", was an assumption that nothing had measured.

### A3. Measured on a scratch Chrome (#294)
**Set-up** (`stage4-back-src.txt`):
- Branded Chrome 156.0.8078.48, on its own `--user-data-dir` under `%TEMP%\claude\s11b-back\profile`.
- Two probe extensions, loaded by CDP `Extensions.loadUnpacked`:
  - `ext-dnr` has the bridge's manifest permissions, including `declarativeNetRequestWithHostAccess`.
  - `ext-plain` has the same permissions without it.
- Fixture servers on 127.0.0.1:18571 and :18572.

**What the probe does**, as `newTab`/`navigate` do (Run 17's helper: `recipes/s11b.ts` `history()`, SDK `newTab` then
`navigate` per URL): `chrome.tabs.create({url, active})`, wait for `complete`; each next URL by `chrome.tabs.update`,
wait for `complete`; then `chrome.tabs.goBack`, then CDP `Page.getNavigationHistory`. Three entries in RD-BACK's
shape (18571, cross-origin `localhost:18572/h/back`, 18571).

**Results.** One tab per run:

| Variant | goBack | History after |
|---|---|---|
| background, wait for load, ext-dnr | refused 3/3 | 3 entries, currentIndex 2, all `[link]` |
| background, wait for load, ext-plain | refused 3/3 | same |
| active (foreground), wait for load, ext-dnr / ext-plain | refused 2/2, 2/2 | same |
| background, wait + 1000 ms settle | refused 2/2 | same |
| background, no wait | refused 2/2 | **2 entries** (the middle navigation was cancelled) |
| history read *before* goBack as well | refused 2/2 | 3 entries both times |
| two allowed pages (RD-BACK-EMPTY's shape), background / active | refused 2/2, 2/2 | 2 entries, currentIndex 1 |
| same-document `#h2` (RD-BACK-SAMEDOC's shape), background | refused 2/2 | 2 entries |
| **user activation** (CDP `Runtime.evaluate {userGesture:true}`) on each page before its `tabs.update`; background, active, ext-plain | **ok 6/6** (5–11 ms), `goForward` ok 6/6 | 3 entries; back landed on the 18572 entry |
| user-activated link click (renderer navigation), background | **ok 2/2**, forward ok 2/2 | 3 entries |
| CDP `Page.navigate` instead of `tabs.update` | refused 2/2 | 3 entries, later ones `[typed]` |
| a script's `location.href = u` (no activation) | refused 2/2 | 3 entries |

Every refusal was exactly `Cannot find a next page in history.`, in 0–11 ms, and the tab stayed on the last entry
(`stage4-back-a.txt`, `-b.txt`).

**Stage C, on a history built the bridge's way** (`stage4-back-c.txt`):
- A user activation on the *current* page, then `goBack`: still refused (2/2).
- CDP `Page.navigateToHistoryEntry(currentIndex − 1)`: ok (2/2).
- `history.back()` run in the page through `chrome.scripting`: reached the previous entry (2/2).

**What this shows:** the entries exist (verifier5's H2 is out), but Chrome's `goBack` skips every entry whose page was
left without a user activation — foreground or background, any wait, with or without the DNR permission. This matches
verifier5's H1 (the history-manipulation intervention; the name is from memory, CDP shows no "skippable" flag). The
bridge never activates a page before `navigate`, so **no history the bridge builds alone has an entry its `back` can
reach**; a human-clicked history would. Every Run 17 back refusal is this.

**Clean-up:** `Browser.close` over the pipe (exit 0, 02:51:23.548Z); servers stopped by PID after a command-line check;
0 processes naming `s11b-back` left; profile checked for reparse points, then deleted; 9234 untouched.

## 4. (B) RD-DISARM

**The record** (`S4-live-run7A-record.md:314-345`): call `start=1793068528272` (02:35:28.272Z); OFF press 29.760Z
(title OFF at 29.827); **ON press 31.026Z** (title armed 31.087); `reply=1793068532307` (**32.307Z**, 4035 ms)
`DOMAIN_BLOCKED` K-tab; `RULES samples=[1,1,1,1]`, then 0; `HITS rdd redirect=1 blocked=0`; `wait-safety NOT reached
… blockedCount=1 … (wanted … blockedCount 0)`. **The press worked**: title OFF in 53 ms, console `safety: disarmed by
the user` (`S4-live-run7A-console.txt:787`).

**The disarm was over before the reply.** The window ran from +1.5 s to +2.8 s; the redirect is at +4 s and the reply
at +4.035 s. The cause is the helper:
- `recipes/s11b-r17.ps1:714` calls `Invoke-S11ButtonPair … -GapMs 1600 -At (ready+1000 ms)`.
- `s11-win.ps1:329-332` measures the gap from the *first* press. So ON lands about 2.6 s into a 4 s call.
- This follows the sheet's own steps (`e2e-test-plan.md:1630`: "at 1 s … pressed once (OFF) … pressed again (ON), 1.6 s
  after"). Those steps contradict the row's expected K-disarmed: no gate run reads a disarmed state after +2.8 s.

**The product answered as designed.** `post()` runs `decide("post")` on a fresh read (`safety-call.ts`), state first
(#137): at 32.3 s it was armed again, so no `DISARMED`; then the tab, on the blocked hop's URL (DNR stopped it,
blocked=0), so `DOMAIN_BLOCKED` K-tab. #137 foresees exactly this ("after re-arming quickly"). The rule outliving the
disarm (1, then 0) is #296's behaviour and passed.

**"wait-safety NOT reached" is a helper comparison slip.** `s11b-r17.ps1:717` compares `daemon.status` with
`$global:S11Found.count` (the found list, 0). RD-DISARM runs inside G1, where the list is found + BLK (1). The daemon
read `blockedCount=1`, which is the G1 state, restored correctly. The sheet asks for "the safety state read back equal
after ON", meaning equal to G1's state.

## 5. Proposed decisions

### 2026-10-27 · The bridge's `back`/`forward` refusal predates Step 11b; the RD-BACK-EMPTY STOP is answered
**Decided:** record that the STOP's premise ("`ok` as before Step 11b") was never measured, and that the pre-Step-11b
answer is the same refusal (A1–A3). Step 11b keeps its code. The four back rows' Run 17 results stand as recorded.
**Why:** the measurement separates the cause: the user activation decides (0 of 26 runs ok without it, 8 of 8 ok with it),
and the permission, foreground and waits play no part. **Instead of:**
- (a) Treat it as a Step 11b regression. The evidence is against this.
- (b) Fix it now. That would change `back`'s behaviour, so it is a product change outside S4.

**Options for the product limitation (for user review):**
1. Leave it, and document that `back`/`forward` only reach entries a human acted on. Rewrite RD-BACK, RD-BACK-SAMEDOC,
   RD-BACK-EMPTY and RD-FWD as new rows, for example with a user activation in the set-up. Note that
   `Runtime.evaluate userGesture` needs the debugger, which shows the banner.
2. Change `back`/`forward` to use `history.back()` through `chrome.scripting` (measured 2/2, no banner), or CDP
   `Page.navigateToHistoryEntry` (2/2, banner). Either way the bridge would bypass a protection Chrome gives the user,
   which is a contract and safety question.

**Recommendation:** option 1 for Step 11b, so S4's back rows are re-specified as new rows with an activated set-up.
Carry option 2 to Step 12 as an open question. **Revisit if:** a Chrome version answers `goBack` ok on an unactivated
history. **By:** Claude (proposed, for user review)

### 2026-10-27 · RD-DISARM's FAIL is a helper/sheet timing fact; re-measure as a new row
**Decided:** the row's FAIL stays as recorded. The product is not at fault. A new row (RD-DISARM-2) presses ON only
after the reply (for example 1.6 s after it), and compares the read-back with G1's count. **Why:** §4's evidence lines.
The ON press at +2.76 s preceded the reply at +4.035 s, and `s11b-r17.ps1:717` compares with the found count.
**Instead of:**
- Editing RD-DISARM's expected text (forbidden, §2).
- Calling the post-check order a defect (it follows #137).

**Revisit if:** a re-measure with the disarm still in force at the reply answers anything but K-disarmed.
**By:** Claude (proposed, for user review)

## 6. Findings
- **For `extension/CLAUDE.md`** (Chrome 156, scratch, 2026-10-27): `goBack`/`goForward` refuse `Cannot find a next page
  in history.` on any history whose pages were left without a user activation (§A3), though CDP lists every entry.
- `tabs.update` without a load wait drops the cancelled entry (3 navigations → 2 entries, 2/2).
- The sheet's RD-DISARM steps contradict its expected text (§4); for S4-record.

## 7. Handoff
No process of mine remains; profile deleted; ports 18570–18572 free. Needs the user: the two rulings above.
