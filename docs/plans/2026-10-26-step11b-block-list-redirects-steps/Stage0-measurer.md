# Step 11b Stage 0 — DNR measurer report

**Model / effort:** Opus 5.5, medium. **Role:** builder (measurer), `docs/agent-rules.md` §6. **Date:** 2026-10-26.

## 1. Verdict

**DONE.** #290's four checks were measured on a separate scratch Chrome (branded 156.0.8078.48, temporary profile,
own CDP port). Both STOP checks, (1) and (2), passed. Pass rules were written before any run
(`stage0-dnr-passrules.txt`). The scratch Chrome was closed by `Browser.close`, the profile was deleted, and no orphan
process remains (`stage0-dnr-setup.txt`).

| #290 check | Result | Evidence (server log counts) |
|---|---|---|
| (1) a `tabIds`+`main_frame` session rule blocks a redirect hop of a `tabs.update` navigation | **PASS** | control A=1 B=1; with the rule A=1 **B=0**; direct leg B=0 (`stage0-dnr-290-1.txt`) |
| (2) the rule is in force when `updateSessionRules` resolves | **PASS** | install race, `tabs.update` started in the same continuation: **B=0 of 25** (A=25); removal race: B=25 of 25. Direct-URL variant the same: 0 and 25 (`stage0-dnr-290-2.txt`) |
| (3) a rule matches the worker's own `fetch` | **MATCHES** | the worker fetch has `tabId -1`, type `xmlhttprequest` and initiator `chrome-extension://<own id>`. `tabIds:[-1]` with or without `initiatorDomains:[<own id>]` blocks it, directly (B=0) and on a redirect hop (A=1, B=0). Control with `initiatorDomains:["other.test"]`: B=1. The probe's own `webRequest.onErrorOccurred` fires with `tabId -1` and `net::ERR_BLOCKED_BY_CLIENT`; the fetch rejects `TypeError: Failed to fetch` (`stage0-dnr-290-3.txt`) |
| (4) caps | **measured** | 5000 session rules (5001 → `Session rule count exceeded.`); 1000 regex rules (1001 → `Session rule count for regex rules exceeded.`), counted inside the 5000. One rule takes ≥ 1,000,000 `requestDomains` (installed in 1372 ms and blocked the last entry). One alternation regex holds 9 hosts of the form `h<n>\.cap\.test` (148 chars); 10 → `memoryLimitExceeded` (`stage0-dnr-290-4.txt`) |

**The largest list the code accepts:** the code has no count cap. `parseBlockList` (`extension/src/safety-match.ts:150-156`)
keeps every valid line, and `analyzeBlockList` (`extension/src/options-model.ts:40-52`) only counts them. The one bound
is `storage.local`: `QUOTA_BYTES` = 10485760, read in the probe. Text that size could hold millions of patterns (an estimate,
not measured). Plain hosts fit in one `requestDomains` rule at any realistic size. Patterns that need a regex (`*.`,
`:port`, IP literals under §5) are capped at 1000
across all the rules alive at once.

## 2. Outputs

In this steps dir: `stage0-dnr-passrules.txt` (written before any run), `stage0-dnr-setup.txt` (method, launch, close),
`stage0-dnr-ext-src.txt` (probe source, 185 lines), `stage0-dnr-290-{1,2,3,4}.txt`, `stage0-dnr-newtab.txt`,
`stage0-dnr-07.txt`, `stage0-dnr-3c.txt`. No code, no commit, no test-count change.

## 3. Facts from 0.2's "not confirmed" list (all measured; details in the evidence files)

- **Redirect hops:** every hop is evaluated (checks (1) and (3d)).
- **`requestDomains`:** host and subdomains match; a dot-less suffix does not (`ocked.test` ≠ `blocked.test`); the port
  is ignored (`127.0.0.1` blocked 18472 and 18473); a trailing-dot URL is blocked; IPv6 needs brackets (`[::1]` yes,
  `::1` no). **IP literals are suffix-matched too** (`["0.0.1"]` blocked `127.0.0.1`). Accepted but matching nothing:
  `"blocked.test:18472"`, `"*.blocked.test"`. Upper case accepted, case-insensitive. Non-ASCII and an empty list rejected.
- **`regexFilter` (RE2):** matched against the full canonical URL with the port (`^http://blocked\.test/` missed
  `:18472`). A default port is never in the URL (`:80` is dropped, so a `:80` regex missed it). Escaped dot literal;
  `(:[0-9]+)?` works; a subdomain-only form matched `sub.` not the apex. Case-insensitive by default
  (`isUrlFilterCaseSensitive:true` flips it). Lookahead, lookbehind, backreference → `syntaxError`; a lookahead rule is
  rejected by `updateSessionRules`.
- **`tabIds`:** session rules only (a dynamic rule with `tabIds` is rejected); `-1` matches the worker's requests.
- **`initiatorDomains`:** the bare extension id matches a `chrome-extension://` initiator; another domain does not.
- **Worker fetch resource type:** `xmlhttprequest`.
- **`tab.url` after a blocked main frame:** **the blocked URL itself**, `pendingUrl` undefined, status `complete`,
  `tabs.update` resolves; webNavigation `onErrorOccurred` (blocked URL, `ERR_BLOCKED_BY_CLIENT`), no `onCommitted`.
- **Atomicity:** a rejected update (invalid regex mixed with a remove and a valid add; over the cap; duplicate id)
  leaves the set unchanged. Remove and add in one call count net (3 − 1 + 4998 = 5000 accepted).
- **newTab** (`stage0-dnr-newtab.txt`): with `tabs.create({url})` (as `handlers/tabs.ts:83`) **the first request
  escapes**: direct URL 10 of 10 reached B, also with the rule installed from `tabs.onCreated`. The redirect variant's
  0 of 10 was a race the rule won. `about:blank` first, rule, then `tabs.update`: 0 of 10.
- **0.7** (`stage0-dnr-07.txt`): Chrome follows neither. Onto the own non-web-accessible page: cancelled (no extension
  context in the tab; a direct-open control has one), but **`tab.url` and the title read the own URL**, so the
  post-check refuses as an own page (#134, #155). Onto `file:`: `ERR_UNSAFE_REDIRECT`, the tab stays on A. A worker
  fetch rejects for both. No STOP.
- **0.11 3c** (`stage0-dnr-3c.txt`): **(i) works from the worker itself.** With file access on, `fetch(file:///…)`,
  5 of 5 per path: existing file → 200 (first chunk only, 1024 B of 5 MB, then `cancel()`); missing file or folder →
  rejects; a folder → status 0 (a listing). Percent-encoded segments handle space, `#`, `ü`, `%`. No webRequest event.
  File access off → every path rejects. **(ii) is worse:** a missing file attaches as size 0 and the page gets
  `input`+`change` first; a 1-byte slice resolves, only a whole read rejects (`NotFoundError`);
  `setFileInputFiles {files: []}` did **not** clear the input; `value=''` cleared it with no event.

## 4. Deviations

- 0.11 named the offscreen document; I measured it and the worker, which answer identically.
- `stage0-dnr-290-3.txt`: my first A-hop count used a wrong `grep` anchor (A=0); recounted by `tag%3D<tag> host`
  before reporting. B counts unchanged.
- Not measured, as outside this brief: today's bridge answer for a redirected `newTab` (0.6 asks Stage 0 to record
  it; it needs the bridge, so it belongs to the audit or Run 17), and the re-run of Step 9's and Step 11's contracts.

## 5. Proposed decisions

### 2026-10-26 · newTab creates at about:blank, then installs its rules, then navigates
**Decided:** `newTab` with a URL: `tabs.create({url:"about:blank", active})`, install the rules for the new id, then
`tabs.update(id, {url})`. **Why:** `create({url})` lets the first request escape (10 of 10); this gave 0 of 10.
**Instead of:** a rule after `create({url})` or from `onCreated` (both escape). **Revisit if:** the extra `about:blank`
history entry changes a visible answer (`goBack` not measured). **By:** Claude (proposed)

### 2026-10-26 · The download half is built with DNR, recognised by onErrorOccurred
**Decided:** `downloadStart` installs `{tabIds:[-1], initiatorDomains:[<own id>], resourceTypes:["xmlhttprequest"]}`
rules for its fetch; 0.6's primary recognition (`onErrorOccurred`, `tabId -1`, `ERR_BLOCKED_BY_CLIENT`, a URL the list
blocks) stands and the flagged fallback is dropped. **Why:** (3), (3e) measured. **Instead of:** the fallback.
**Revisit if:** S3 finds `network-scope`/`safety-network` ingesting `tabId -1` events in a way the rule changes.
**By:** Claude (proposed)

### 2026-10-26 · navigate's post-check stays as is
**Decided:** no post-check change for a blocked hop: `tab.url` reads the blocked URL, so `isUrlBlocked(tab.url)` answers
`DOMAIN_BLOCKED` as 0.6 wants. **Why:** measured in (1), (2) and newTab. **Revisit if:** Run 17's RD-1 reads otherwise.
**By:** Claude (proposed)

### 2026-10-26 · S1's translation rules and caps
**Decided:**
- A plain host with no port goes into one `requestDomains` rule per call (the size is unbounded in practice).
- An IP literal goes into an anchored regex, not `requestDomains`, since DNR suffix-matches IPs (a full IPv4 is
  very likely safe there, but the regex holds by construction).
- `*.host` and every `:port` pattern become anchored, case-insensitive regexes over the canonical URL. A default port
  (80 for http, 443 for https) must match the URL *without* a port.
- S1 never emits `requestDomains` holding `:`, `*` or upper case, and has a guard test for it.
- Each call counts its rules. When the regex rules alive across all calls would pass 1000, or all rules would pass
  5000, the call fails closed (0.5).

**Why:** §3 and check (4). **Instead of:** one alternation regex (9 hosts, then `memoryLimitExceeded`);
`urlFilter "||host:port^"` (measured: host and subdomains on that port only; saves regex budget, but the default-port gap).
**Revisit if:** realistic lists approach 1000 regex patterns. **By:** Claude (proposed)

### 2026-10-26 · 3c uses check (i) in the service worker
**Decided:** before the attach, for each path: `fetch(file:///<percent-encoded segments>)` in the worker. A path is a
file only on status 200. A rejection (missing) or status 0 (a folder) refuses with `BAD_PARAMS` naming the index. Read
the first chunk, then `cancel()`. No offscreen document is needed. **Why:** measured 5 of 5 per case; (ii) lets the
page see a missing file before any check, and its clear does not work. **Instead of:** (ii). **Revisit if:** a race
between the check and the attach matters (time-of-check to time-of-use, accepted). **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed.
- **Gotcha candidate for `recipes/CLAUDE.md`:** on this machine `chrome.exe` run without its own `--user-data-dir`
  (even `--version`) is handed to the user's running Chrome ("Opening in existing browser session."). I did this once
  to read the version. It may have opened a window or tab in the user's Chrome. Nothing else reached it.
- **Gotcha candidate:** branded Chrome 156 loads an unpacked extension on a temp profile by `--remote-debugging-pipe
  --enable-unsafe-extension-debugging` + CDP `Extensions.loadUnpacked` (file access on); a `runtime.reload()` or
  file-access toggle leaves it DISABLED until `management.setEnabled`.
- **For S2:** the 1000-regex cap is shared by every live call (one extension). Installing a 1M-domain rule took 1.37 s.

## 7. Handoff

- No process of mine remains (scratch chrome.exe, srv.py, node launcher: 0 each); profile deleted; 9234 never used.
- `%TEMP%\claude\s11b-stage0` keeps the probe, scripts, logs and small test files; safe to delete.
- Nothing needs the user's keyboard. The user may want to know about the stray `--version` hand-off (§6).
