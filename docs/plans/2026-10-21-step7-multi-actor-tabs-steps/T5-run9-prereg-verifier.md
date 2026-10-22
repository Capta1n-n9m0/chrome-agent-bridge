# T5 Run 9 pre-registration: independent verifier (2026-10-23)

Under test (uncommitted, HEAD `b0aa22f`): `docs/e2e-test-plan.md` §4.15 + two §5 template lines, the
"Run 9" section of `T5-wave-sheet.md`, `recipes/t5-png.ts` (`hueName`/`barColour`/`describeBar`, `--hue`),
`recipes/t5.ts` (`--hue` in `imageLine`, `r9-cdp`, `r9-restore`). Nothing connected, built, or committed.

## Verdict: FAIL (2 MAJOR, both fixable before any measurement; 5 MINOR, 2 notes)

## Findings

**1. MAJOR: R9-SCREEN-2's "the active tab still captures (cyan)" can't pass on a fresh window. The text doesn't match the code.**
`r9cdp` never paints a bar on the human's tab. It calls only `visible()` (`VISLOG_INSTALL`) on `h.tab`.
`screen2` paints one (`t5.ts:618`, `barExpression(COLOURS.cyan, "HUMAN")`), but `r9cdp` doesn't. Its PASS
needs `img.colour === "cyan"` (`t5.ts:947`). In the Run 9 order the row runs second, before SCREEN-1 paints
anything, on a Ws that is freshly set up: Run 8's close-down `cleanup` closed every T5 tab. The probes then
read the bare fixture and give `other`/`mixed`, so a correct T5b build is judged FAIL. Whether the row
passes depends on set-up nobody controls.
*Fix:* in `r9cdp`'s default branch, add `await evalJson(client, h.tab, barExpression(COLOURS.cyan, "HUMAN"))`
before the 10 s lead, so its evaluate banner clears inside the lead. The other option is a `t5.ts mark
screen-human cyan` step in the row.

**2. MAJOR: T5b §9 fix 3's second check isn't covered, and R9-LEASE-3's objective claims more than the steps test.**
T5b §9 asks: "Another client acting on the popup must get `TAB_HELD` even before the event arrives." The
objective says "the popup is held before anyone else acts". But actor C acts only during the 90 s hold,
which starts after `leaseGranted`, so the row tests TAB_HELD after the event. The omission isn't stated
either.
*Fix:* one of two.
- (a) Add a scripted second SDK client to `lease3`. It polls `listTabs` (every 50 ms) from the click,
  calls `selectTab`/`tabs.claim` on the popup's handle the moment it appears, and records whether the
  `TAB_HELD` came before the opener's `leaseGranted` (both timestamps). The lease is granted in
  `applyOpener` before `fillUrl`, and the event waits for up to 2 s of polling (`intercept.ts:78, 208, 221`),
  so the window can be reached.
- (b) Restate the objective and record the omission with its reason and the T5b unit test that covers it.

**3. MINOR: R9-RESTORE gives the wrong reason for not running the `focusTab` sub-check.**
The row says focusing the covered window uncovers it. But Wc is topmost, and a non-topmost window that
gets the foreground stays below a topmost one. The real obstacle is the daemon's visibility lock.
`focusTab` takes it (`methods.ts:62`), and `lock.acquire` is FIFO with no re-entry (`lock.ts:49`). So a
`focusTab` during the hang waits for the screenshot's TIMEOUT at 35 s, which is after the 30 s restore.
Through the daemon the scenario can't happen.
*Fix:* replace the reason text with this one. The omission itself stands.

**4. MINOR: R9-SCREEN-2's banner window ends right where the next debugger attach happens.**
After the call, `r9cdp` sleeps exactly 1000 ms and then runs `visLog` evaluates on both tabs. Those attach
the debugger, so the banner appears just after `t1 + 1 s`, and the window runs to `t1 + 1 s`. A frame near
the edge can fail a correct build. The "positive control" band change also comes first from these
evaluates, not from the active-tab CDP capture. The 10 s lead before `t0` is long enough: in Run 8 EVAL-1
the banner cleared about 4.7 s after the evaluate.
*Fix:* sleep ≥ 2500 ms before `visLog`, or end the window at `t1 + 0.5 s`. Credit the positive control to
"the evaluates/CDP capture that follow".

**5. MINOR: the hue rule is sound, but one asymmetry needs naming in the disclosure.**
Offline test (`npx tsx <scratchpad>/huetest.ts`, synthetic PNGs built with zlib):
```
magenta 944 DPR1.5 label 340: … (472,24) #dd00fa (708,24) #dd00fa (924,24) #dd00fa → magenta (hue rule)
cyan human 944: … → cyan        blank white page: … #ffffff … → other
red #d92424 → red   lime #8fff3d → lime   blue #3300f8 → blue
magenta label reaching w/2 (DPR 2, 944 wide, label 480): (472,24) #000000 … → mixed
bar only 20 rows: → other       half magenta / half cyan: → mixed
hueName: #ffff00 yellow, #b4ff00 lime, #b5ff00 yellow, #ffffff/#000000/#808080/#ff8080 other
```
A wrong image fails in every case: the human's cyan against a magenta target, a blank page, a probe on
the label, a mixed frame. The label can't reach x = w/2 at DPR 1. Run 8's images were 1920 px wide for
1920 px windows. The longest label, "SCREEN-1 TARGET" in bold 24 px, is about 230 px, against
w/2 = 472 for the 944 px image. If a probe ever does land on the label, the result is `mixed`, which fails.

Lime is the exception: it uses `R ≤ 180` where every other colour uses `≤ 100`. That admits exactly Run 8's
`#8fff3d` (R = 143). This can't flatter a result: no row's wrong image (cyan, white, red, blue, magenta)
classifies as lime. Still, the disclosure covers the thresholds only in general.
*Fix:* add one clause: "lime's R ≤ 180 (not ≤ 100) admits Run 8's `#8fff3d`". With that, the disclosure is
enough.

**6. MINOR: R9-NET-1's `^+r` step has no helper and no focus guard.**
`t5-win.ps1` has no SendKeys function. If the keys reach the wrong foreground window, they reload a user
tab, which is an integrity-floor item.
*Fix:* `Set-T5Foreground <W>` must print `True`, then
`[System.Windows.Forms.SendKeys]::SendWait('^+r')`, and anything else aborts the step.

The method itself is sound:
- Ctrl+Shift+R bypasses the cache and sends no conditional headers. Python's server therefore answers
  `200`, where a plain reload would get `304`.
- `from cache: no` comes from `network-log.ts:351`.
- `wc -c test-fixtures/e2e-playground.html` = 13106, so `12.8 KB` and `content-length: 13106`. That tells
  it apart from Run 8's cached 12914 B (`12.6 KB`).

**7. MINOR: R9-RESOLVER-1's UI Automation "finds" has no read-only helper.**
`Invoke-T5Uia` *invokes* the first match, for example the `⚙ sw.js` context selector or a source link. It
also prints the element's name, and a console line could put a URL into the record.
*Fix:* a find-only step that prints match counts only. The rule itself is sound and can't be met by
accident. Any DevTools window prints `<DevTools window>` (`t5-win.ps1:56`), but the rule also needs
`Hwnd` = Wd plus the `sw.js` and `[bridge]` content.

**8. NOTE: R9-RESTORE is the right test, and its induction is safe.**
- The bound: `CHAIN_RELEASE_MAX_MS = 30_000` runs from the start of the link (`tabs.ts:124,181`). The
  daemon waits `daemonWaitMs(undefined)` = 35 000 (`route.ts:12-16`) and fails with `TIMEOUT: Timed out
  after 35000ms calling screenshot` (`connection.ts:31`).
- The old build never restores: in Run 8 the target was still in front at 49 s. So the 25–35 s window
  (the script's own `inWindow`) separates the fix from the old behaviour.
- Only the driver's windows are touched. Wc covers the user's windows for about 40 s without interacting
  with them.
- "Not measured" on any outcome other than TIMEOUT is honest, because the outcome line is printed first.
  The parenthetical "(set-up: the window was not fully covered)" assumes the cause.
- Nothing maximizes Wc yet; name the method.

**9. NOTE: cross-checks, Run 8 left untouched, and the build.**
Every quoted string matches the code that prints it:
- `CDP_HIDDEN_MESSAGE` / `CDP_MINIMIZED_MESSAGE` (`tabs.ts:93-96`): refused before the debugger attaches
  (`perceive.ts:25-31`); `cdpCaptureRefusal` adds no `data`.
- TAB_HELD text (`intercept.ts:405`); the `leaseGranted` key order (`intercept.ts:261`).
- `Cleared … requests.` (`registry.ts:453`); the `Network — active tab: showing …` header (`network-log.ts:264,299`).
- Every `say(...)` line in `r9cdp`/`r9restore`/`lease3`/`screen*`.
- Each row's PASS conditions equal the script's. The driver checks the extras: `<ms>` ≤ 2500 for LEASE-3,
  the banner frames, `Test-T5Minimized`, `Get-T5Foreground`, the server log.

Run 8 is untouched:
- `git diff -U0` of both docs has no `-` lines.
- `t5.ts` changes only 2 existing lines: the import, and `--hue`/`--minimized` added as flags that take no
  value. Without `--hue`, `imageLine` is unchanged, and no Run 8 judged line changed.

Build and order:
- `npx tsc --noEmit -p recipes` → exit 0.
- The dist files are the T5b build: `sha256sum daemon/dist/index.js` = `490f1c60…d974`, and
  `extension/dist/sw.js` contains the new message. Their mtimes (01:44:20) come after commit `12ecb65`
  (01:44:04).
- R9-RELOAD-1 is the first line. R9-SCREEN-2 is a working check for a stale build: a stale extension
  gives `TIMEOUT` after 25 000 ms (`timeoutMs` 20 000 + 5 000), where T5b answers `OFFSCREEN` in under 1 s.
  It still needs finding 1's fix.
- T5b §9 coverage: fix 1 has the first check (the second is omitted, see 3), fix 2 has all three, and
  fix 3 has the url check (the TAB_HELD-before-event check is missing, see 2).

NIT: the usage header of `t5-png.ts` doesn't list `--hue`. `r9cdp` never sets a non-zero exit code on FAIL.

## Re-check (fix round 1)

This re-check covers only the affected items, under the same hard limits. `npx tsc --noEmit -p recipes` → exit 0.
`t5-win.ps1` parses: `Parser::ParseFile` → `parse errors: 0`.

**Updated verdict: FAIL.** Fix round 1 closed findings 1–7, but it introduced two new MAJOR findings.

Findings 1–7:
- **1 (M1): closed.** `r9cdp` now paints `barExpression(COLOURS.cyan, "HUMAN")` on `h.tab` before `visible()`
  and the 10 s lead (`t5.ts`, default branch).
- **2 (M2): closed in the script.** `lease3 --race` starts the second client before the click. It matches
  the popup by `POPUP_URL`, or by opener + owner when the url is still empty. It snapshots the popup and
  records whether `leaseGranted` had already arrived. Without `--race`, `lease3` is unchanged. The row's
  wording is fixed too. New finding R1 is in the row's expected text.
- **3: closed.** The reason now given is the FIFO lock (`lock.ts`), which is correct.
- **4: closed.** The window now ends at `t1 + 0.5 s`, and the positive control is credited to the
  script's own debugger use, which resumes 1 s after `t1`.
- **5: closed.** The disclosure now names lime's `R ≤ 180` and `#8fff3d`.
- **6: closed.** NET-1 requires `Set-T5Foreground` to print `True` and `Get-T5Foreground` to name the
  window, else no keys are sent.
- **7: closed in intent.** New finding R2 is in the helper.

**R1. MAJOR (wrong text): R9-LEASE-3's race line leaves out the error's `data`.**
`checkLease` throws `TAB_HELD` with data `{ owner, since }` (`daemon/src/intercept.ts:402-406`). `toWire`
carries it, and `describeError` (`t5-lib.ts:40-44`) adds ` · data {"owner":"t5-lease3","since":<epoch ms>}`
after the message. So the script will print
`its snapshot → TAB_HELD: tab <T#p> is held by "t5-lease3" since <hh:mm:ss> — use browser_new_tab, or browser_list_tabs to pick a free tab · data {"owner":"t5-lease3","since":<n>}; leaseGranted had already arrived: …`.
The expected text has nothing between `free tab` and `; leaseGranted`, so read literally a correct build
fails.
*Fix:* add ` · data {"owner":"t5-lease3","since":<n>}` to the expected text. Pre-registered text, so fix
it now, before step 1.

**R2. MAJOR (doesn't discriminate): `Find-T5Uia` treats `[bridge]` as a wildcard character class.**
The helper tests `$e.Current.Name -like "*$p*"`. In PowerShell's `-like`, `[bridge]` means "any one of
b, r, i, d, g, e". Measured:
```
'hello' -like '*[bridge]*'  → True
'xyz'   -like '*[bridge]*'  → False
```
So almost every element with a name counts toward `'[bridge]'`, and its count ≥ 1 passes in any DevTools
window. That makes the console check meaningless. `sw.js` is unaffected, since `.` is literal under
`-like`.
*Fix:* use `$e.Current.Name.Contains($p)` (an ordinal substring test), or
`-like ('*' + [WildcardPattern]::Escape($p) + '*')`.

Optional (not required): the R9-RESOLVER-1 table cell still says "UI Automation in Wd finds a name
containing …". The rule paragraph names `Find-T5Uia`, so point the cell at it too.

## Re-check (fix round 2)

**Final verdict: PASS.** The pre-registration is ready for Run 9.

- **R1 is closed.** R9-LEASE-3's race line now expects `… pick a free tab · data {"owner":"t5-lease3","since":<epoch ms>}; leaseGranted had already arrived: <yes|no>`. That matches what the code prints:
  - `describeError` writes `JSON.stringify(safeData(data))`.
  - The keys come in the order the data is built: `{ owner, since }` (`intercept.ts:406`).
- **R2 is closed.**
  - `Find-T5Uia` now tests `$e.Current.Name -and $e.Current.Name.Contains($p)`, a plain substring match.
  - Measured: `"hello".Contains("[bridge]")` → False and `"[bridge] connection: up".Contains("[bridge]")` → True.
  - The R9-RESOLVER-1 table cell now names `Find-T5Uia` and its literal match.
  - `t5-win.ps1` parses: `parse errors: 0`.
