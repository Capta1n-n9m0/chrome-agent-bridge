# Step 11b Stage 0 — verifier, round 2 (follow-up F-a..F-d only)

**Model / effort:** Opus 5.5, medium. **Role:** verifier, `docs/agent-rules.md` §6. **Date:** 2026-10-26.
**Claims audited:** `Stage0-measurer2.md`, `stage0-dnr-followup.txt`. Read with them: the phase doc's Stage 0 (lines
261–283), 0.4, 0.6; `Stage0-verifier.md` §3 and M2; `stage0-audit.md` F1, F2, F10, F17 and §8; `stage0-dnr-setup.txt`.

## 1. Verdict

**PASS-with-notes.** All three facts I re-measured reproduce exactly: F-d, F-a and F-b. F-c's reading holds on its
own evidence. The evidence is clean for a public repo. There is no CRITICAL or MAJOR finding. There are two MINORs and
two NITs (§4). The one that matters for S1 is N1: the §8 guard test does not catch the failure F-d measured.

## 2. Re-measurement (decision #294 method)

I worked in `%TEMP%\claude\s11b-stage0\verify2\`, with the follow-up's probe extension unchanged and its tools copied.
I loaded only the probe. The scratch Chrome was branded Chrome on a fresh `--user-data-dir` under `verify2`
(`Browser.getVersion` → `Chrome/156.0.8078.48`), with CDP port 18790, F on 18791 and W on 18794. All three ports were
free by `netstat` before the run, and 9234 was not used. I wrote the pass rules to `verify2\passrules.txt` before the
first run. Raw output is in `verify2\logs\fd.out` and `verify2\logs\fab.out` (scratch, not for commit).

### F-d: download-style rule vs the offscreen socket

The rule is `D = {tabIds:[-1], initiatorDomains:[probe id], requestDomains:["127.0.0.1"]}`. The phases ran in order:
N1 (no rule), T (`D` with `resourceTypes:["xmlhttprequest"]`), U (`D` with no `resourceTypes`), then N2 (rules
cleared). Each phase opened 3 sockets in the offscreen document (`chrome.offscreen`, `offscreen.html`), made 3 worker
fetches, and opened 1 worker WebSocket as a record. Counts come from `grep -c` of each tag in W's log:

```
N1 ows UPGRADE=3 swf GET=3 sws UPGRADE=1     offscreen 3x ["open","msg:hi"]            -> control holds
T  ows UPGRADE=3 swf GET=0 sws UPGRADE=1     offscreen 3x open; swf 3x "Failed to fetch",
                                             onErrorOccurred tab=-1 xmlhttprequest ERR_BLOCKED_BY_CLIENT -> PROTECTED, rule live
U  ows UPGRADE=0 swf GET=0 sws UPGRADE=1     offscreen 3x ["error","close:1006"];
                                             onErrorOccurred tab=-1 websocket init=own ERR_BLOCKED_BY_CLIENT -> HIT
N2 ows UPGRADE=3 swf GET=3 sws UPGRADE=1     offscreen 3x open                         -> removal restores
```

**The follow-up's claim is CONFIRMED** (T = PROTECTED, U = HIT).

### F-a: the raw trailing-dot entry

The rule is `R(E) = {requestDomains:[E], tabIds:[work], resourceTypes:["main_frame"]}`, run on a background tab. F's
log gave: `v2-fa-ctl hits=1` (no rule); `blocked.test.` was **accepted** (`getSessionRules` returned
`["blocked.test."]`) and gave `v2-fa-raw hits=1`, with no error; canonical `blocked.test` gave `v2-fa-can hits=0` and
`net::ERR_BLOCKED_BY_CLIENT`. **CONFIRMED:** the raw form is accepted silently and blocks nothing. The server-side
control resolves.

### F-b: `about:blank`, then `tabs.update`

3 of 3 per variant:

```
V1 created[url="" pendingUrl="about:blank"]     history.length=2
V2 created[url="" pendingUrl="<the target URL>"] history.length=1
```

**CONFIRMED.** I did not re-run `goBack` or the page's own `history.back()`.

### Teardown

`Browser.close` over the pipe returned `{"id":3,"result":{}}`, and Chrome exited with code 0. I checked the command
lines of python 16260 (`srv.py 18791 …verify2…`) and node 30540 (`ws.mjs 18794 …verify2…`), then stopped them by
PID. The profile had no reparse points (`dir /AL /S /B` → File Not Found), and it is deleted (`test -e` → absent).
After that, no process had `s11b-stage0\verify2` in its command line, and nothing listened on 18790–18794. I did not
touch the user's Chrome, profile or tabs.

## 3. Adjudication: F-d against verifier 1's F2 downgrade

**Both measurements are right. They measured different contexts, and the bridge's context is the offscreen one.**
- Verifier 1's F2-extra opened a **worker** WebSocket. It reached the server under the untyped rule, and webRequest
  logged no event for it (`Stage0-verifier.md`, F2 row). My run reproduces this in the same session that blocked the
  offscreen socket. In phase U, `sws UPGRADE=1` and the socket opened. The probe's webRequest recorded no `sws` event
  in any phase, while it recorded every `ows` and `swf` event. In Chrome 156, a socket opened from the service
  worker bypasses webRequest and DNR. A socket opened from the offscreen document does not.
- The bridge's socket lives in the offscreen document (`extension/src/offscreen.ts:26` →
  `extension/src/client.ts:51`). The untyped rule **does** cut the daemon off for new handshakes, which is F2's
  original risk.
- Consequence: verifier 1's M2 downgrade of F2 to MINOR rested on the wrong context. **F2 returns to MAJOR as a
  risk.** The proposed decision (a typed `resourceTypes`) closes it, so the guard test is required, not "cheap
  insurance". Its wording is not yet enough (N1).
- d3 is the follow-up's record: a socket already open survives a new rule. I did not re-measure it. It means a bad
  rule shows up only at the next reconnect, so the failure is latent and timing-dependent. That is a further reason
  for a structural test.

## 4. Findings

### N1 — MINOR: the §8 guard test does not discriminate the measured failure

- **Where:** `stage0-audit.md` §8, "download rules name the worker fetch's resource type and never `websocket`".
  `Stage0-measurer2.md:70-73` calls it "confirmed, not changed".
- **Evidence:** phase U above. The rule that blocks the socket has **no** `resourceTypes` and lists no `websocket`.
  An S1 test that pins "no rule lists `websocket`" passes on exactly the rule that cut the socket 3 of 3.
- **Fix:** reword the decision's test. Every download-half rule has `resourceTypes` present and equal to
  `["xmlhttprequest"]`, and no rule with `tabIds` containing `-1` lacks `resourceTypes`. Keep "never `websocket`" as
  well. Cite F-d d2 and this report.

### N2 — MINOR: one finding over-generalises "every extension context"

- **Where:** `Stage0-measurer2.md:79-80`: "No resource type on a download rule blocks new WebSocket handshakes to a
  listed host from **every extension context**." `stage0-dnr-followup.txt:162-164` (d4) says "every extension
  context's xmlhttprequest matches".
- **Evidence:** the worker WebSocket opened under the untyped rule (`U … sws UPGRADE=1`, no webRequest event; also
  verifier 1's `f2-nort B=1`). Only the offscreen document and the worker were measured. The xhr half holds for
  both. The WebSocket half is false for the worker.
- **Fix:** state the candidate gotcha as measured: "an untyped `tabIds:[-1]` + own-initiator rule blocks the
  offscreen document's new WebSocket handshakes (`ERR_BLOCKED_BY_CLIENT`, type `websocket`). A service-worker
  WebSocket is invisible to webRequest and DNR (Chrome 156)."

### N3 — NIT: one F-a row has no server-side control

- **Where:** `stage0-dnr-followup.txt:100`. The canonical rule with URL host `blocked.test.` gave "0 hits … BLOCKS".
- **Evidence:** `blocked.test.` does not resolve under the resolver map (line 102: `ERR_NAME_NOT_RESOLVED`), so 0
  hits holds with or without the rule. Only the error code shows the match. This is the same gap as verifier 1's M3.
  The fact itself stands on verifier 1's V4b (`localhost.`, 1 hit → 0 hits).
- **Fix:** cite V4b next to line 100 and line 111.

### N4 — NIT: the newTab decision's `back` claim is narrower than written

- **Where:** `Stage0-measurer2.md:65`, "The bridge's `back` … is unchanged: it rejected in both variants".
- **Evidence:** this was measured only right after the first load. `goBack` rejecting while `history.length` is 2 and
  the page's `history.back()` works fits Chrome skipping an entry added without user activation for browser-side
  back. That is an inference, not measured. The sequence `newTab(A)` → `navigate(B)` → `back` → `back` was not
  measured.
- **Fix:** write "measured after the first load only". Name the multi-step sequence as an RD-2 or S3 record row, so
  the user review sees it.

### F-c (read, not re-measured)

The reading is sound. The Part 1 control (`twin-dnr` against `twin-nodnr`) showed no difference
(`stage0-dnr-followup.txt:137-138`), so by its own rule the page method is NOT DISCRIMINATING. "The page cannot prove
it" follows. One note for D4.2 and RD-0: a live wave on the real profile has no CDP, so `chrome.management.get` from
`chrome://extensions` is not available there. The proof there is a behaviour of the build (F17's S0F fallback), as
`Stage0-measurer2.md:81-84` already concludes.

### Public-repo hygiene

`grep` for a user path, `aliev`, `token`, and any URL host other than `*.test`, `*.example`, `127.0.0.1` and
`localhost` found nothing. The only hit is `host.123` in a `new URL` string at `stage0-dnr-followup.txt:26`, which is
a probe literal. Paths are written `%TEMP%\…`. The extension ids belong to throwaway CDP-loaded probes. **Clean.**

### Proposed decisions, checked against the facts

1. **The canonical host only, never a trailing dot:** supported by F-a (re-measured) and V4b. "Every host the matcher
   accepts is accepted" rests on 8 sampled classes. The matcher's URL-parser canonicalisation makes the sample
   representative, but S1's own test should still run the S1 case table's plain hosts through `updateSessionRules`
   live, or say that it does not.
2. **newTab through `about:blank`, for user review:** supported by F-b (re-measured), with the narrowing in N4.
   `tab-events.ts:140` (`pendingUrl ?? url`) is cited correctly.
3. **The download-rule decision "confirmed":** the fact is confirmed, but its test needs N1's rewording. The only
   fetch is `handlers/download.ts:40`, and `grep` for `fetch(` and `XMLHttpRequest` in `extension/src` finds no
   other, so the revisit condition is not met.

## 5. Handoff

There are no PIDs, watchers or profiles left. Scratch is in `%TEMP%\claude\s11b-stage0\verify2\`: `passrules.txt`,
`x\`, `logs\`. The step agent should:
- apply N1 to the §8 decision;
- restore F2 to MAJOR, closed by the decision;
- correct N2's gotcha wording before it reaches `extension/CLAUDE.md`.
