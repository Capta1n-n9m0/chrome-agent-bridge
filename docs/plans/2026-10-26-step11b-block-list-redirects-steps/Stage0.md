# Step 11b — Stage 0 (spec audit and DNR measurements): step report

**Date:** 2026-10-26 · **Step agent:** Opus 5.5, medium · **Tree:** HEAD `9ddaa36` (no product code changed) ·
**Children (all Opus, medium):** measurer (`Stage0-measurer.md`), auditor (`Stage0-auditor.md`, `stage0-audit.md`,
`stage0-s1-cases.md`), follow-up measurer (`Stage0-measurer2.md`), verifier (`Stage0-verifier.md`), verifier round 2
on the follow-up only (`Stage0-verifier2.md`).
**Brief READ list:** the phase doc in full; decisions #290–#294 and Open decisions; spec §6 and §10; Step 9 as-built
"Contracts (binding forward)"; Step 11 phase doc § STOP rules and § As built; e2e plan §4.20, §4.21, §4.23 by range;
the code files named in the step brief.

## 1. Verdict

**DONE.** Z.1 is met (verifier: PASS-with-notes; round 2: PASS-with-notes). Both STOP checks of #290 pass, measured
twice on separate scratch Chromes. One incident and two contract-level proposals go to the user (§7).

| #290 check | Result (server-log counts) | Evidence |
|---|---|---|
| (1) a `tabIds` + `main_frame` session rule blocks a redirect hop of a `tabs.update` navigation | **PASS**: control blocked port 1, with the rule 0; verifier re-run the same | `stage0-dnr-290-1.txt`; `Stage0-verifier.md` V1 |
| (2) the rule is in force when `updateSessionRules` resolves | **PASS**: 0 of 25 (verifier 0 of 25); removal equally immediate (25 of 25) | `stage0-dnr-290-2.txt`; V2 |
| (3) a rule matches the worker's own `fetch` | **MATCHES**: tab `-1`, type `xmlhttprequest`, initiator the own id; blocked direct and on a hop; `onErrorOccurred` `net::ERR_BLOCKED_BY_CLIENT` reaches the extension | `stage0-dnr-290-3.txt`; V3 |
| (4) limits | 5000 session rules, of them at most 1000 regex; one `requestDomains` rule took 1,000,000 hosts; one alternation regex holds only 9 hosts. The block list has no count cap in code (only the 10 MiB `storage.local` quota) | `stage0-dnr-290-4.txt`; V5 |

Method (#294): branded Chrome 156.0.8078.48 on a fresh `--user-data-dir`, `--remote-debugging-pipe
--enable-unsafe-extension-debugging`, CDP `Extensions.loadUnpacked`; fixture servers on 127.0.0.1; closed by
`Browser.close`; profiles deleted; no process left (`stage0-dnr-setup.txt`, each child's §7).

## 2. Outputs

- Measurements: `stage0-dnr-passrules.txt` (written before the runs), `-setup`, `-ext-src`, `-290-1..4`, `-newtab`,
  `-07`, `-3c`, `-followup`.
- Audit: `stage0-audit.md` (counts, contracts, today's `newTab` answer, F1–F24, decision attacks, home table, `hidden`),
  `stage0-s1-cases.md` (104 rows, expected column from running `isUrlBlocked`).
- Counts at `9ddaa36`, re-derived by the auditor and the verifier: 27 router methods, 27 codes (26 on the wire),
  24 tools, `npm test` 3811 tests / 154 files, log-scan allowlist 54. All match the phase doc. Test count unchanged.
- Contracts on port 0: Step 9's set 1059 tests / 32 files pass; Step 11's set 499 / 16 pass (commands in
  `stage0-audit.md` §2; re-run by the verifier).

## 3. Verifier verdicts

- `Stage0-verifier.md`: **PASS-with-notes** (M1–M7, all MINOR/NIT). Re-measured #290 (1)–(4) and the `newTab` escape;
  settled the auditor/measurer disagreements: **F4 refuted** (a `requestDomains` rule for `localhost` blocks
  `localhost.`: control 1, test 0), **F5 refuted** (`tab.url` reads the blocked URL, `complete`, also in a background
  tab), F2 downgraded (a worker socket was not blocked; the offscreen socket not measured).
- `Stage0-verifier2.md` (follow-up facts F-a–F-d only): **PASS-with-notes** (N1, N2 MINOR; N3, N4 NIT). Re-measured
  F-d, F-a and F-b, all reproduced. Restores F2 to MAJOR as a risk (the bridge's socket is in the offscreen document;
  verifier 1 had measured a worker socket), closed by proposal 2 with N1's stronger guard. N1, N2 and N4 are applied
  below.

## 4. Settled facts (each measured unless marked)

- **Redirect hops** are each evaluated (navigation and worker fetch).
- **`requestDomains`**: host and subdomains, no dot-less suffix; the port is ignored; IPv6 needs brackets; it
  **suffix-matches IP literals** (`0.0.1` blocked `127.0.0.1`); `host:port`, `*.host` and a raw `host.` are accepted
  and match nothing; every host the matcher accepts (`_`, single label, `localhost`, punycode, 63/64-char labels) is
  accepted and blocks; non-ASCII rejected.
- **`regexFilter`**: full canonical URL incl. port; a default port never appears in the URL; case-insensitive by
  default; lookaround and backreferences rejected (`isRegexSupported` → `syntaxError`); escaped dots literal.
- **`tabIds`**: session rules only; `-1` = the worker's (and offscreen document's) requests; `initiatorDomains` takes
  the bare extension id.
- **Atomicity**: a rejected update (invalid regex, over the cap, duplicate id) leaves the set unchanged.
- **After a blocked main frame**: `tab.url` = the blocked URL, `pendingUrl` undefined, `status: complete`,
  `tabs.update` resolves; webNavigation `onErrorOccurred` `ERR_BLOCKED_BY_CLIENT`, no `onCommitted`.
- **`newTab` leak**: `tabs.create({url})` lets the first request escape a rule installed on the returned id (10/10;
  verifier 5/5; an `onCreated` listener also too late). `about:blank` → install → `tabs.update`: 0/10 (verifier 0/5),
  at the cost of `tabCreated.url` = `about:blank` and history length 2.
- **0.7**: Chrome follows neither a redirect onto the own non-web-accessible page nor onto `file:`
  (`ERR_UNSAFE_REDIRECT`); on the own-page case `tab.url` reads the own page, so the post-check refuses. No STOP.
- **3c**: check (i) works from the **service worker** (`fetch(file:///…)`, percent-encoded segments; 200 = file, first
  chunk read then `cancel()`; reject = missing; status 0 = folder; 5/5 per case). (ii) is worse: the page sees the
  missing file first, and `DOM.setFileInputFiles {files: []}` does not clear the input. **(i) chosen.**
- **Extensions page** cannot prove the new permission (identical lines with or without it); only
  `chrome.runtime.getManifest()` / `chrome.management.get` in a script can (F-c).
- **Offscreen socket** (F-d, re-measured by verifier 2): an untyped `{tabIds:[-1], initiatorDomains:[own id]}` rule
  listing `127.0.0.1` refuses the offscreen document's new WebSocket handshakes (3/3, `ERR_BLOCKED_BY_CLIENT`, type
  `websocket`); with `resourceTypes:["xmlhttprequest"]` they open (3/3) while worker fetches stay blocked. A
  service-worker WebSocket is invisible to webRequest and DNR (Chrome 156). An open socket survives a new rule.
- Read, not measured: whether the 5000/1000 caps hold on Chrome 116–119 (`minimum_chrome_version` is `116`; F21).

## 5. Deviations

- A follow-up measurer was added after the first two children: four facts the audit depended on (F10 host forms,
  F1 history/`tabCreated`, F17 the extensions page, F2 the offscreen socket) were not in the first measurement. Its
  outputs got their own verifier (round 2), not a fix round.
- The measurer measured 3c from the worker as well as the offscreen document (identical); the worker suffices.

## 6. Proposed decisions

Full texts in §5 format: `stage0-audit.md` §8 (ten), `Stage0-measurer.md` §5 (five), `Stage0-measurer2.md` §5 (two).
Reconciled here (the verifiers' rulings applied; superseded items marked):

1. **`newTab` with a URL opens `about:blank`, installs its rule, then navigates** (audit §8.1, measurer §5.1,
   measurer2 §5.2). Contract: `tabCreated.url` becomes `about:blank`, history length 2; the bridge's `back` rejected
   right after the first load only (the sequence `newTab` → `navigate` → `back` → `back` is not measured: an RD-2 or
   S3 record row, verifier 2 N4). **For user review.** The
   conservative alternative if the user rejects it: `newTab` uncovered and recorded as a known gap (its first request
   escapes, as today).
2. **Download rules** `{tabIds:[-1], initiatorDomains:[<own id>], resourceTypes:["xmlhttprequest"]}`, never
   `websocket` (audit §8.2, measurer §5.2, F2 MAJOR closed by it). The guard test is N1's: every download-half
   rule (any rule whose `tabIds` holds `-1`) has `resourceTypes` present and equal to `["xmlhttprequest"]`; "no rule
   lists `websocket`" alone passes on the untyped rule that cut the socket. The download half is built (#290 (3)).
3. **0.6's flagged fallback is dropped**, not needed: the blocked worker hop is recognised by `onErrorOccurred`
   (tab `-1`, `ERR_BLOCKED_BY_CLIENT`, URL tested in memory), read inside the existing listener **before** `ingest`,
   which today drops blocked hosts (audit F6, `sw.ts:101-115,143-146`) (audit §8.3, measurer §5.2).
4. **`navigate`'s post-check stays as is** (measurer §5.3); audit §8.4 (a webRequest source) is optional, not adopted.
5. **A disarm does not lift a running call's rules**; only the call's own end and the start-up clear remove them
   (audit §8.5, F8). Amends 0.5.
6. **0.5's wording**: install keyed on the method class and run once per call (F7: `effect()` is shared and runs
   twice for a download); a rejected rebuild leaves the previous rules in force and refuses the live call's reply
   (F13); an empty list makes no API call (F15); a keeper rejection never reaches the wire with Chrome's text (F14).
7. **S1's translation** (measurer §5.4 + measurer2 §5.1, superseding audit §8.7's alternation and `host.` parts):
   plain hosts → one `requestDomains` rule per call with the matcher's canonical host only (no `.`-ending, `:`, `*`,
   upper case; guard test); IP literals → anchored regex (DNR suffix-matches IPs); `*.` and `:port` → one anchored
   case-insensitive regex per pattern, a default port matching the URL without a port; the cap test against
   5000/1000, counted across all live calls; past the cap the call fails closed (0.5) and the options page warns
   (0.9's caps line becomes in scope). S1's equivalence emulation must model the measured fact that a `requestDomains`
   rule also blocks the trailing-dot URL (row 9 of `stage0-s1-cases.md` agrees once modelled).
8. **`back`/`forward` carry the tab rule** (audit §8.8, F12): stricter, within "a bridge call in flight".
9. **Run 17**: RD-5b (a navigate held by a delayed redirect while the pattern is added: 0 hits), RD-2 with one expected
   outcome (the tab's URL is the blocked URL; a later `snapshot` refused `DOMAIN_BLOCKED`), RD-0's build proof by
   `chrome.runtime.getManifest()` in an extension context or an S0F behaviour (F-HOME's refusal), not the extensions
   page (audit §8.6, F11, F17, F-c).
10. **S0F**: 3c by check (i) in the worker (measurer §5.5); the home predicate with ASCII case folding and the 8.3 and
    macOS aliases (audit §8.9, table §5); `file:` rows hidden as `"blocked"` (audit §8.10, §6); the pinned
    `s3-options-upload.test.ts:67` warning test listed as a changed test; S0F split into S0F-a (home, `hidden`, the
    tool description) and S0F-b (3c) (F18).
11. **Plan-side notes**: 0.9 gains F22's blind spots (a `sub_frame` of the target, an allowed origin's service worker,
    `tabReplaced` mid-navigate, `[::ffff:127.0.0.1]`); D3.3's `<start>` = S3's start commit (F16); the caps' Chrome
    floor (F21): S1/S3 read `MAX_NUMBER_OF_SESSION_RULES`/`MAX_NUMBER_OF_REGEX_RULES` at run time or the minimum
    version is raised (a manifest change, for the session agent); the audit's wrong citations corrected — `newTab`'s
    create is `handlers/tabs.ts:82-84`, the download `effect()` calls `download.ts:33,43` (verifier M1).

## 7. Findings (for the user and the session agent)

- **Incident (verifier M4; #294's Revisit-if may be met).** Before launching its scratch Chrome, the measurer ran
  `chrome.exe --version` once without a profile of its own. Windows handed it to the user's running Chrome ("Opening
  in existing browser session."), which may have opened a window or tab there. Nothing else reached the user's Chrome;
  no evidence depends on it. Escalated to the session agent to tell the user. Gotcha for `recipes/CLAUDE.md`: never
  run `chrome.exe` on this machine without an own `--user-data-dir`, not even `--version`; read the version from
  `Browser.getVersion` or the install folder. (Every later child was briefed so and complied.)
- **Gotcha candidate (`recipes/CLAUDE.md`)**: branded Chrome 156 loads an unpacked extension on a temporary profile
  via `--remote-debugging-pipe --enable-unsafe-extension-debugging` + CDP `Extensions.loadUnpacked`, with file access
  already on; `chrome.runtime.reload()` or a file-access toggle leaves it DISABLED until `management.setEnabled`.
- **Gotcha candidate (`extension/CLAUDE.md`, verifier 2 N2's wording):** an untyped `tabIds:[-1]` + own-initiator DNR
  rule blocks the offscreen document's new WebSocket handshakes (`ERR_BLOCKED_BY_CLIENT`, type `websocket`); a
  service-worker WebSocket is invisible to webRequest and DNR (Chrome 156, 2026-10-26, `Stage0-verifier2.md` §2).
- No pre-registered check failed. No STOP rule fired.

## 8. Handoff

- No process of any child remains (each verified by command line); every temporary profile deleted. The scratch
  folder `%TEMP%\claude\s11b-stage0` keeps probes and logs (no profile); safe to delete.
- For the stage split: proposals 1 (user review) and 5–7 change S2/S3's items; proposal 10 splits S0F; S1 consumes
  `stage0-s1-cases.md` with proposal 7; S4-sheet consumes proposal 9.
- Nothing needs the user's keyboard, except the review of proposal 1 and the incident.
