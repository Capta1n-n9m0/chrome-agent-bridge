# Step 10 S1 — Run 14 record (§4.21)

## Attempt 1 (runner 1) — stopped at block 1

Runner: Opus 5.5 · HEAD 5f17d54 (prep commit 5f17d54) · wave start: not reached (stopped at block 1, 2026-10-24T21:12:29Z)
PIDs: none started · driver windows: none opened
Pin state found: not read (block 3 not reached)

Lines: none — the wave stopped at block 1 (preflight) before L1. Found state and restore: start (block 6) not reached ·
end (block 13) not reached. The stop procedure printed
`RESTORE safety: nothing to restore (no found state was read, so no toggle ran)` and `RESTORE ok: safety state, pin,
layout and windows as found`.

STOP lines met (attempt 1):
- block 1: `STOP: 4 tracked file(s) modified - the wave runs on committed code only (at 2026-10-24T21:12:29.584Z)` and
  `STOP: block preflight: 4 tracked file(s) modified - …` → ledger "Return 1".

## Attempt 2 (runner 2) — after `-Block reset` (2026-10-24T21:13:59Z, state files archived with suffix .20261024T211359Z)

Runner: Opus 5.5 · Chrome 156.0.8078.48 · Node v25.2.1 · HEAD e321c1a (prep commit 5f17d54) · wave start 2026-10-24T21:14:17.041Z
PIDs: daemon 14188 · http8080 32060 · http8081 11880 · redirect8083 12776 · driver windows W 2690320 E 788142 D 4261394 O <block 6>
Pin state found: pinned=true · keyboard layout 0x04090409 · Chrome windows at start 1

(The pre-flight lines of blocks 1–4 are in `S1.ledger.md` — "Found state" / "Live PIDs" — not here: L1 is the
record's first recorded line, S1.2.)

## Lines (one per observation; L1 = SAFE-0 is the first recorded line)

L1: 2026-10-24T21:14:26.733Z · SAFE-0 · 5 · `ROW SAFE-0 safety safety armed=true evaluate=true blockedCount=0 (reported after 1 ms of polling)` + `CHECK SAFE-0 safety PASS — daemon.status.safety reported (only a Step 9 extension sends safetyState)` · PASS vs §4.21
2026-10-24T21:14:26.737Z · SAFE-0 · 5 · `ROW SAFE-0 navigate-own-options DOMAIN_BLOCKED The bridge never opens extension pages. (3 ms)` + `CHECK SAFE-0 navigate-own-options PASS — DOMAIN_BLOCKED, exact message, no data` · PASS
2026-10-24T21:14:26.741Z · SAFE-0 · 5 · `ROW SAFE-0 url-after T835 url http://localhost:8080/e2e-playground.html?s9=a` + `CHECK SAFE-0 url-after PASS — tab a still on its fixture URL` · PASS
2026-10-24T21:14:26.763Z · SAFE-0 · 5 · `SAFE-0 tuple read before any reload: safety armed=true evaluate=true blockedCount=0 (expected default: safety armed=true evaluate=true blockedCount=0)` · PASS (no reload needed)
2026-10-24T21:14:18Z · SAFE-0 · 5 · daemon log tail: `safety state: armed=true evaluate=true blocked=0` then `extension resync: 2 tabs, 0 gone` · RECORD (order as by design, #195)
SAFE-0 row: PASS.
2026-10-24T21:14:41.048Z · R14-FOUND · 6 · `ROW R14-FOUND status safety armed=true evaluate=true blockedCount=0 extensionConnected=true rows=7 rowsWithUrl=7 rowsWith8081=1` · RECORD
2026-10-24T21:14:43.071Z · R14-FOUND · 6 · `STORED read: the old options page in window 1771554 is gone after 16 ms` · `STORED read: window 1771554 reloaded onto a fresh options page` · RECORD
2026-10-24T21:14:43.876Z · R14-FOUND · 6 · `STATE armed=true evaluate=true count=0 lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 status "Bridge armed." summary "0 blocked sites."` · PASS
2026-10-24T21:14:44.130Z · R14-FOUND · 6 · `ROW R14-FOUND-guard wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})` · PASS
2026-10-24T21:14:44.160Z · R14-FOUND · 6 · `FOUND STATE = the expected default (armed, JavaScript on, empty list; O and daemon.status agree): the toggles may run` · `FOUND STATE recorded: armed=true evaluate=true count=0 lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` · PASS (guard passed; O = 1771554)
2026-10-24T21:14:49.017Z · R14-REL-3 · 7 · `ROW R14-REL-3 open ok T841 tabs before=8 after=9 (58 ms)` + `CHECK R14-REL-3 open PASS — ok` · PASS
2026-10-24T21:14:49.480Z · R14-REL-3 · 7 · `ROW R14-REL-3 rel ok (199 ms)` · RECORD
2026-10-24T21:14:49.486Z · R14-REL-3 · 7 · `ROW R14-REL-3 rel-class T841 wrapper=view-source inner=http own=no` + `CHECK R14-REL-3 rel-class PASS — the class line is printed in the agreed form and no URL is printed` · PASS (class RECORD: wrapper=view-source inner=http own=no; no `rel-snap`, since own=no)
2026-10-24T21:14:49.754Z · R14-REL-3 · 7 · `ROW R14-REL-3 tabs ok tabs total=9 hidden(disarmed)=0 hidden(blocked)=1 withTitle=8 withUrl=8 url8081=1 (3 ms)` · RECORD
R14-REL-3 row: PASS.
2026-10-24T21:14:53.966Z · R14-POP-1 · 8 · `ROW R14-POP-1 claim ok T835 (0 ms)` · `ROW R14-POP-1 claim-owner T835 owner="s9-r14-pop1"` · `CHECK R14-POP-1 claim PASS — T835 held by this client before the click` · PASS (printed before the click)
2026-10-24T21:14:54.022Z · R14-POP-1 · 8 · `ROW R14-POP-1 click-synthetic ok (48 ms)` · RECORD
2026-10-24T21:14:59.002Z · R14-POP-1 · 8 · `ROW R14-POP-1 synthetic tabs opened since the claim: 1` · `ROW R14-POP-1 synthetic no leaseGranted within 5 s` · `CHECK R14-POP-1 leaseGranted FAIL — a popup opened from the held opener and no leaseGranted came` · FAIL
2026-10-24T21:14:59.030Z · R14-POP-1 · 8 · `ROW R14-POP-1 close-T842 ok (25 ms)` · `ROW R14-POP-1 release ok T835 (1 ms)` · RECORD
R14-POP-1 row: FAIL (no leaseGranted for the popup T842 opened from the held opener T835; no trusted fallback, since a tab opened).
2026-10-24T21:15:05.256Z · R14-3 · 9 · `PLACED W left and O right on W's monitor work area [1920,0,3840,1080] (split at x=3072); O then W brought to the front` · RECORD
2026-10-24T21:15:05.558Z · R14-3 · 9 · `ROW R14-3 placement-before-switch W [1920,0,3072,1080] minimized=false visible=true · O [3072,0,3840,1080] minimized=false visible=true · work areas [0,0,1920,1080] [1920,0,3840,1080] · occluders above O 1` + `CHECK R14-3 placement-before-switch FAIL — 1 window(s) above O overlap it (O is covered)` · placement guard → STOP (before the switch: the safety state was never changed)
R14-3: NOT MEASURED (the wave stopped at its placement guard). R14-4b, R14-5c-ctl, R14-5c, R14-RESTORE (block 13),
R14-LOGS, R14-TEARDOWN: not run (every later block refuses after a stop). The stop procedure did the restore and the
clean-up instead (below).

## Found state and restore (S1.4)
start (block 6): `FOUND STATE recorded: armed=true evaluate=true count=0 lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
end (the stop procedure at block 9, not block 13): `STATE armed=true evaluate=true count=0 lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 status "Bridge armed." summary "0 blocked sites."` · `SWITCH armed already true - nothing pressed` · `SWITCH evaluate already true - nothing pressed` · `RESTORE safety: the stored list is already empty - not saved again` · `ROW R14-STOP wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms` · `RESTORE safety read-back: stored page equal true, daemon.status equal true, title armed true, block-list sha256 vs found equal` · `RESTORE ok: safety state, pin, layout and windows as found` · equal: yes (nothing was pressed: the state was never touched)

## STOP lines met (S1.5; every one is a return in S1.ledger.md)
- attempt 1, block 1: see above → ledger "Return 1".
- attempt 2, block 9 (r3), 2026-10-24T21:15:05.580Z / .593Z:
  `STOP: R14-3 placement guard: W and O are not side by side, uncovered by each other and by any window above O (no occluder), on a work area and restored (at 2026-10-24T21:15:05.580Z)` and
  `STOP: block r3: R14-3 placement guard: … - the stop procedure runs (restore and read-back, clean-up); then write the ledger and RETURN to the step agent (at 2026-10-24T21:15:05.593Z)` →
  restore read back equal (above); `STOPPED at block r3. Restore: read back equal (RESTORE ok); processes: ended. Every later block refuses to run.` (exit 2) → ledger "Return 2".

## Counts (S1.6; counts only)
not reached (block 14 did not run; the daemon log and the console were not scanned, and nothing was copied).

## Set-up fixes (helper changes between rows, before the next row's first observation; none after a STOP)
- none
