# Step 11b Stage 0 — DNR measurer report, follow-up (F-a..F-d)

**Model / effort:** Opus 5.5, medium. **Role:** builder (measurer, follow-up), `docs/agent-rules.md` §6. **Date:** 2026-10-26.

## 1. Verdict

**DONE.** Four facts that `stage0-audit.md` depends on (F10, F1, F17, F2; §7 facts 1, 6, 7) were measured. The
method was the same as `stage0-dnr-setup.txt`: branded Chrome 156.0.8078.48 on its own temporary profile under
`%TEMP%\claude\s11b-stage0\followup`, with CDP port 18580. The pass and record rules were written before any run, as
Part 1 of `stage0-dnr-followup.txt`. F-d's first run did not discriminate: its control failed because of a bug in the
fixture server. That run is recorded as such, and a second run with new tags gives the result below.

| Fact | Result | Evidence (counts) |
|---|---|---|
| F-a: `requestDomains` takes every host the matcher accepts | **Yes, and each one blocks.** The exception is the raw trailing-dot form | `my_host.example`, `localhost`, `example`, `xn--bcher-kva.example`, a 63-char label, a 64-char label, `1host.test` and `blocked.test` were all accepted. Each blocked: control 1 hit, test 0 hits, `ERR_BLOCKED_BY_CLIENT`. `blocked.test.` was **accepted but blocked nothing**: control 1, test 1. `host.123` was accepted by Chrome, but the matcher calls it invalid (`safety-match.ts:86-90`), so it never reaches a rule |
| F-b: `newTab` creates `about:blank`, adds the rule, then calls `tabs.update` | **Adds one history entry; changes `onCreated.pendingUrl`** | 5 of 5 runs: 2 entries `[about:blank, target]` and `history.length` 2, against 1 entry and 1 for `create({url})`. `onCreated`: `{url:"", pendingUrl:"about:blank"}` against `pendingUrl:<target>`. `chrome.tabs.goBack` **rejects** ("Cannot find a next page in history.") in both variants. The page's own `history.back()` **does** return to `about:blank` (3 of 3) |
| F-c: does `chrome://extensions` show `declarativeNetRequestWithHostAccess`? | **No, and the method cannot tell even the control apart** | `developerPrivate` warnings, `getPermissionWarningsById` and the details page's Permissions section are identical for the bridge's permission set with nothing added, with `+DNRWithHostAccess` and with `+declarativeNetRequest`: "Access the page debugger backend" and "Read and change all your data on all websites". Only `chrome.management.get(id).permissions` lists it |
| F-d: does a download-style rule stop the offscreen WebSocket? | **With `resourceTypes:["xmlhttprequest"]` the socket is safe; without it, it is blocked** | Control: 3/3 open. Typed rule: 3/3 open, UPGRADE 3, and the same rule blocked 3/3 worker fetches (so it was live). Untyped rule: 3/3 refused, UPGRADE 0, `ERR_BLOCKED_BY_CLIENT` with type `websocket`. A socket that was already open survives an untyped rule (readyState 1, `send` ok) |

## 2. Outputs

- `docs/plans/2026-10-26-step11b-block-list-redirects-steps/stage0-dnr-followup.txt`: Part 1 holds the rules, written
  before the run. Part 2 holds the results, the method and the teardown.
- This report.
- Scratch: `%TEMP%\claude\s11b-stage0\followup\` holds `tools/`, `x/` (the scripts), `logs/`, the probe and three
  twin extensions. Its profile has been deleted.
- No code, no commit, no change to the test count.

## 3. Verifier verdict

Not applicable: this is a leaf measurement.

## 4. Deviations

- F-d run 1 is not discriminating. The fixture WebSocket server had a mistyped RFC 6455 GUID, so every handshake
  failed, even with no rule. I fixed the server, tested it against node's WebSocket client and ran F-d again with new
  tags under the same Part 1 rules. Run 1 is kept in the evidence file, marked as not used.
- I added records the brief did not ask for: a 64-char label, `1host.test`, the canonical `blocked.test` next to the
  raw `blocked.test.`, a twin carrying plain `declarativeNetRequest` as the F-c control, `chrome.management.get` in
  F-c, and the in-page `history.back()` in F-b. Each is labelled as a record in the evidence.

## 5. Proposed decisions

Only where a fact changes a proposal in `stage0-audit.md` §8.

### 2026-10-26 · Step 11b Stage 0: S1 emits only the canonical host in `requestDomains`, never a trailing dot
**Decided:** S1 replaces one clause of §8's "S1 emits only forms Chrome accepts…". Every plain-host rule puts
`pattern.host`, the matcher's canonical form, into `requestDomains`. It never puts the line's text or a `host.` form
there. An S1 test pins that no emitted `requestDomains` entry ends in `.`. Without the trailing-dot clause, the clause
"any pattern Chrome rejects in `requestDomains` takes the regex form" no longer applies to plain hosts, because every
host the matcher accepts was accepted. Regex forms keep §8's caps. **Why:** F-a. Chrome accepts `blocked.test.` and
then silently matches nothing, while `blocked.test` also blocks a URL written `blocked.test.`. Every other host the
matcher accepts is accepted and blocks, so F10's darkening case cannot come from a `requestDomains` host. **Instead
of:** §8's "with `host.` if accepted". **Revisit if:** a later Chrome rejects one of the measured forms. **By:** Claude
(proposed)

### 2026-10-26 · Step 11b Stage 0: `newTab` through `about:blank` — the revisit trigger is met; keep it and say what changes
**Decided:** keep §8's proposal 1. `create({url})` lets the first request escape the rule (10 of 10,
`stage0-dnr-newtab.txt`), and no other order was measured to close that gap. Its revisit trigger fired, so the user
review must cover these visible changes:
- `tabCreated.url` becomes `about:blank`, because `tab-events.ts:140` sends `pendingUrl ?? url`.
- The new tab has 2 history entries and `history.length` 2.
- The page's own `history.back()` reaches `about:blank`.

The bridge's `back` (`handlers/history.ts:8`, `chrome.tabs.goBack`) is unchanged: it rejected in both variants.
**Why:** F-b. **Instead of:** `create({url})`, which escapes. Also instead of a `location.replace` into the blank tab,
which was not measured and is a possible S3 alternative if the extra entry matters. **Revisit if:** the user objects
to the `tabCreated` url or the extra entry. **By:** Claude (proposed; contract, **for user review**)

§8's download-rule proposal (`resourceTypes` = the worker fetch's type, never `websocket`) is **confirmed, not
changed**. Its revisit condition ("the type is shared by another request the extension makes") is met only in
principle. An offscreen-document `fetch` matches the same rule (d4), but the bridge has no fetch other than
`handlers/download.ts:40`; its only socket is `client.ts:51`.

## 6. Findings

- **The raw trailing-dot host is a silent no-op in DNR** (Chrome 156, F-a): `requestDomains:["blocked.test."]` is
  accepted, and the page loaded (1 hit). This is a candidate for `extension/CLAUDE.md` once S1 builds the rules.
- **No resource type on a download rule blocks new WebSocket handshakes to a listed host from every extension
  context.** Sockets already open are not cut (F-d d2, d3). This is a candidate gotcha for S1.
- **F17 is resolved against the page.** The extensions page cannot prove that a build holds
  `declarativeNetRequestWithHostAccess`: with `<all_urls>` it shows no line for it, and none for plain
  `declarativeNetRequest` either. So the audit's fallback stands: prove the loaded build by an S0F behaviour, or by
  `chrome.runtime.getManifest()` or `chrome.management.get` in a script.
- `chrome.tabs.goBack`'s rejection text reads "next page" even for back (Chrome 156).

## 7. Handoff

Chrome closed by `Browser.close` (exit code 0). The servers were stopped by PID after checking their command lines.
No chrome, node, python or nohup process whose command line names the followup folder remains, and nothing listens
on 18580–18589. The profile was checked for reparse points (none) and deleted. The user's Chrome was not touched. No
PIDs or watchers are left.
