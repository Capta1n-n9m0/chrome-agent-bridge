# Step 11b Stage 0 — verifier report

**Model / effort:** Opus 5.5, medium · **Role:** verifier (`docs/agent-rules.md` §6) · **Date:** 2026-10-26 ·
**Tree:** HEAD `9ddaa36`; the working tree differs only by the other agent's `journal.md` edit and the Stage 0 outputs
(untracked). No repo file was edited except this report.

## 1. Verdict

**PASS-with-notes.** Every Z.1 exit check is met. I re-ran each of the four #290 checks myself. I also ran two
checks that settle where the builders disagree, and re-ran the audit's counts, contracts, S1 table and home table.
Every one agrees with the builders, with two exceptions:
- **F4:** the measurer is right. A host with a trailing dot is blocked by `requestDomains`. F4 is not a defect.
- **F5:** the measurer is right. `tab.url` reads the blocked URL, also in a background tab, so the post-check answers
  `DOMAIN_BLOCKED`.

No CRITICAL or MAJOR finding is against Stage 0's outputs. The auditor's CRITICAL F1 is a correct plan finding: it
needs the user's ruling, it is not a defect.

## 2. Re-measurement (DNR), method and pass rules

- **Method:** #294, exactly as the brief says. A separate branded Chrome 156.0.8078.48 (the version read over CDP
  `Browser.getVersion`), on a fresh `--user-data-dir` under `%TEMP%\claude\s11b-stage0\verify\profile`, with its own
  pipe and CDP port 18690. The probe was loaded by `Extensions.loadUnpacked`. Fixture servers ran on 127.0.0.1:18691
  (A, the redirector) and 127.0.0.1:18692 (B, blocked); the ports were checked free with `netstat -ano`, and 9234 was
  never used.
- **Pass rules** were written before each run, in `%TEMP%\claude\s11b-stage0\verify\passrules.txt`, with one dated
  addendum before V4b and one before V6.
- **Two deliberate differences from the measurer:**
  - The probe holds only `declarativeNetRequestWithHostAccess`, `tabs`, `webRequest` and `webNavigation`. The
    measurer's probe also held `declarativeNetRequestFeedback`, and 0.3 (A) does not.
  - The work tab is a background tab (`active:false`), the bridge's `newTab` default. The measurer's was in front.
- **Close:** by `Browser.close` (`chrome exited code=0`). The two python servers were stopped by PID after checking
  their command lines. Processes with `s11b-stage0\verify` in the command line: 0. Profile reparse-point check:
  `File Not Found`; the profile was then deleted (`test -e` → deleted).
- Another agent's run (`s11b-stage0\followup`, CDP port 18580) was live at the same time. I left it untouched.

| # | Check (pass rule) | Result | Evidence (`grep -c <tag>` on the server logs) |
|---|---|---|---|
| V1 | #290 (1): a redirect hop of `tabs.update` | **PASS** | `v1-ctl A=1 B=1`; `v1-test A=1 B=0`; events `before main_frame B → error main_frame net::ERR_BLOCKED_BY_CLIENT → nav-error`; `tab.url` = the blocked URL, `status complete`, `active:false` |
| V2 | #290 (2): install, then `tabs.update` in the same continuation, 25 times | **PASS** | `A=25 B=0`; 25 × `complete` |
| V3 | #290 (3): the worker's own `fetch` | **PASS (matches)** | `v3-ctl B=1` (event: `tab=-1 xmlhttprequest init=own`); rule `{requestDomains, tabIds:[-1], initiatorDomains:[own], resourceTypes:["xmlhttprequest"]}`: `v3-direct B=0`, `v3-redir A=1 B=0`, fetch `TypeError: Failed to fetch`, `onErrorOccurred tab=-1 … net::ERR_BLOCKED_BY_CLIENT`; control `initiatorDomains:["other.test"]`: `B=1` |
| V4 | F4: trailing dot on `blocked.test.` | **not discriminating at the server** | control `ERR_NAME_NOT_RESOLVED`, B=0 (`MAP *.test` does not map `blocked.test.`); with the rule `ERR_BLOCKED_BY_CLIENT` (tab, a redirect hop and the worker fetch): the rule matched before DNS |
| V4b | F4 with `localhost.` (resolves to loopback) | **PASS for the measurer, F4 refuted** | no rule: `v4b-ctl B=1` (`host=localhost.:18692`); `requestDomains:["localhost"]`: `v4b-test B=0`, `ERR_BLOCKED_BY_CLIENT`. It also shows that a single-label `requestDomains` entry is accepted and matches (F10's question) |
| V5 | #290 (4): caps | **PASS** | 5000 rules `ok`, 5001 `Session rule count exceeded.`; 1000 regex rules `ok`, 1001 `Session rule count for regex rules exceeded.`; 0 rules after |
| V6 | newTab (F1 and the measurer's newTab file) | **confirmed** | `tabs.create({url})`, then a rule for the new id: B=5 of 5 (escapes); `about:blank`, then the rule, then `tabs.update` through A: A=5, **B=0** |
| F2 (extra) | a worker `WebSocket` to B under `{tabIds:[-1], initiatorDomains:[own]}` with no `resourceTypes` | **not reproduced** | `f2-ctl B=1`, `f2-nort B=1`, `f2-xhr B=1`; webRequest saw no event for it. The offscreen document's socket was not measured |

The raw outputs are in `%TEMP%\claude\s11b-stage0\verify\logs\v*.out` (scratch, not for commit).

## 3. Adjudication of the builders' disagreements

- **F4 (auditor) vs "a trailing-dot URL is blocked" (measurer): the measurer is right.**
  - V4b discriminates at the server: 1 hit without the rule, 0 with it. Chrome's `requestDomains` matches
    `localhost.` for an entry `localhost`.
  - The auditor's row 9 ✗ came from a WHATWG emulation, not from Chrome.
  - Consequence: S1 needs no `host.` entry. S1's "DNR (emulated)" column for row 9 should carry a note that the
    measured result is a match (V4b), so the emulated ✗ is not read as a fact.
  - Note on the measurer's own row `rd-trailing-dot-url`: it had no server-side control (its B=0 would hold without
    any rule, since `blocked.test.` does not resolve). Only its error code (`ERR_BLOCKED_BY_CLIENT`, where an
    unresolved name gives `ERR_NAME_NOT_RESOLVED`, V4) shows the match. MINOR (M3).
- **F5 (auditor) vs "`tab.url` reads the blocked URL" (measurer): the measurer is right.**
  - The auditor's probe is correct as a conditional: on `chrome-error://`, the post-check would answer `allow`. But
    that condition is false: V1 read the blocked URL with `status complete`, on a background tab too.
  - So `navigate`'s post-check answers `DOMAIN_BLOCKED` with no change, and the auditor's proposed decision 4
    (`navigate` names the hop from `onErrorOccurred`) is at most a second check. Its own Revisit-if ("if the sibling
    shows `tab.url` reads the blocked URL…") is met.
  - The measurer's "navigate's post-check stays as is" stands. F6 (the ingest gate drops that event, confirmed at
    `sw.ts:113-116,143-146` and `safety-network.ts:9-11`) then only matters for the download half.
- **F2: downgrade to MINOR.** The worker's WebSocket was not blocked even with no `resourceTypes` (above), and the
  offscreen socket is unmeasured. Both builders already propose `resourceTypes:["xmlhttprequest"]` for the download
  rule, which V3 shows blocks the fetch. Keep it, and keep the auditor's guard test (no rule lists `websocket`) as cheap
  insurance.
- **F1 and the newTab decision: both builders agree, and V6 confirms it** (5 of 5 escape; `about:blank` first gives
  0 of 5). The contract side (the `tabCreated` url, an extra `about:blank` history entry and `goBack`, which nobody
  measured) remains **for user review**, as the auditor marks it.
- **F3 and 0.6's fallback:** check (3) matches (V3), so 0.4 (C)'s condition for the download half is **confirmed**. The
  fallback is unnecessary, and both builders propose dropping it. The download half is buildable with DNR, recognised
  by `onErrorOccurred` with `tabId -1` and `ERR_BLOCKED_BY_CLIENT`.

## 4. Re-executed audit findings and counts (host side, port 0)

| Item | Command → output | Agrees |
|---|---|---|
| router methods | `grep -o 'router\.on("[A-Za-z]*"' extension/src/sw.ts \| sort -u \| wc -l` → `27`; `node scripts/doc-check.mjs` → `tools: 24 · router methods: 27 · codes: 27` | yes |
| codes | tsx import of `shared/src/codes.ts` → `total 27 daemon 9 ext 17 sdk 1` (26 on the wire) | yes |
| tools | `grep -oE '"browser_[a-z_]+"' mcp/src/tools/registry.ts \| sort -u \| wc -l` → `24` | yes |
| `npm test` | `npx vitest run` → `Test Files 154 passed (154)`, `Tests 3811 passed (3811)`, exit 0 | yes |
| log-scan allowlist | tsx import of `LOG_ALLOWLIST` → `allow 54 {"extension":15,"daemon":33,"mcp":6}` | yes |
| Step 9 contracts | the audit §2 command, verbatim → `Test Files 32 passed (32)`, `Tests 1059 passed (1059)` | yes |
| Step 11 contracts | the audit §2 command, verbatim → `Test Files 16 passed (16)`, `Tests 499 passed (499)` | yes |
| S1 table | `s1check.ts`: parses all 104 rows and runs `isUrlBlocked(url, parseBlockList(pattern))`, with the invalid and ignored rows required false → `rows=104 distinctIds=104 agree=104` | yes; ≥ 60 met |
| home table, "Today" column | `home.ts` over 28 lines through `analyzeUploadFolders` and `uploadPathAllowed` → e.g. `C:\Users warn used`, `C:\DOCUME~1 … used`, `/HOME/fixture-home … used`, `/var/root … used`, `C:\ unused`, `/ unused` | yes |
| F1 | `extension/src/handlers/tabs.ts:82-84`: `effect()`, then `chrome.tabs.create({url})`, then `waitForLoad` | yes (see M1 for the line numbers) |
| F7 | `download.ts:33` `effect()`, `download.ts:43` `checkFinalUrl`, which calls `effect()` again (`safety-call.ts:247-250`) | yes (M1) |
| F6 | `sw.ts:143-146` `onErrorOccurred` → `ingest` → the gate drops blocked URLs (`safety-network.ts:9-11`) | yes |
| `hidden` reason | `daemon/src/intercept.ts:318,597` key `forgetPage` on `"blocked"`; `shared/src/protocol.ts:665` `HiddenReason = "disarmed" \| "blocked"` | yes; reuse `"blocked"` holds |

## 5. Exit criteria (Z.1 and the brief's list)

| Criterion | Met | Where |
|---|---|---|
| findings ranked with command and output | yes | `stage0-audit.md` §4 (24 findings) |
| #290 (1)–(4), each with method and evidence | yes; re-measured here | `stage0-dnr-290-{1..4}.txt`; §2 above |
| each fact from 0.2's "not confirmed" list measured or cited | yes, all measured: hops, own fetch, `tabIds`/`-1`, `initiatorDomains`, the fetch's type (`xmlhttprequest`), regex cap and RE2, `tab.url`, the worker's `onErrorOccurred` | `Stage0-measurer.md` §3; V1, V3 and V5 confirm |
| 3c (i) vs (ii) measured, one chosen | yes, (i) | `stage0-dnr-3c.txt` (read, not re-measured) |
| the `hidden` reason decided | yes, `"blocked"` | audit §6 |
| home predicate table (Windows and POSIX; `X:\Users`, `/home`, `/Users`, `/root`) | yes | audit §5 |
| S1 table ≥ 60 cases, its expected column from `isUrlBlocked` | yes, 104/104 re-derived | `stage0-s1-cases.md` |
| every (proposed) decision 0.1–0.11 attacked | yes | audit §4, "Each decision attacked" |
| counts recomputed | yes, re-derived here | §4 |
| Step 9's and Step 11's contracts on port 0 | yes, re-run here | §4 |
| 0.4 (C)'s conditions confirmed | yes | V3 |
| the evidence's security boundary | yes, see M5 | — |

## 6. Findings

| # | Sev | Where | Finding and evidence | Suggested fix |
|---|---|---|---|---|
| M1 | MINOR | `stage0-audit.md` F1, F7, §3 | **Wrong line citations.** The audit cites `handlers/tabs.ts:101-107` / `103-104` (`wc -l` → 97 lines; the code is at 82-84) and `download.ts:151` (92 lines; the code is at 33 and 43). The other citations checked are right: `safety.ts:327-328`, `tabs.ts:299`, `intercept.ts:318,597,627`, `protocol.ts:665`. A builder brief copying these would point at nothing. | Correct the three citations when the step agent turns F1/F7 into stage items |
| M2 | MINOR | `stage0-audit.md` F4, F5, F2; proposed decisions 4 and 7 | **The audit's MAJORs F4 and F5 are refuted, and F2 is not reproduced**, by measurement (V4b, V1, F2-extra). As written, the audit still carries them as MAJOR, with proposals (`host.` entries; a webRequest source for `navigate`) that the facts make unnecessary. | Step agent: F4 and F5 closed by measurement (cite this report); F2 MINOR, and keep `resourceTypes:["xmlhttprequest"]` plus the no-`websocket` guard; drop the `host.` part of decision 7; decision 4 is optional |
| M3 | MINOR | `stage0-dnr-290-4.txt:68` | **The measurer's trailing-dot row has no server-side control.** `blocked.test.` does not resolve (V4 control `ERR_NAME_NOT_RESOLVED`), so its `A/B/C=0/0/0` would also hold with no rule. Its conclusion is right (V4b), but its evidence alone is the error code. | Cite V4b beside the row in the stage split; no re-run needed |
| M4 | MINOR | `stage0-dnr-setup.txt` ("with one exception"), `Stage0-measurer.md` §6 | **#294's Revisit-if may be triggered.** Revisit-if reads: "a second Chrome instance disturbs the user's running Chrome in any way". The measurer's one `chrome.exe --version` was handed to the user's running Chrome ("Opening in existing browser session."), which may have opened a window or tab there. The measurer recorded it honestly. It invalidates no evidence. | Step agent escalates per #294; the session agent tells the user; the gotcha goes to `recipes/CLAUDE.md` at closeout (the measurer's candidate) |
| M5 | NIT | the steps dir | **Security boundary: clean.** `grep` over every `*.md`/`*.txt` in the steps dir: no user-profile path (local paths are written `%TEMP%`), no token, no real site. The URL schemes found are `*.test`, `bank.example`, `127.0.0.1`, `[::1]`, `localhost:8081` and scratch `chrome-extension://` ids. The scratch id `plnop…` is a path hash, which is harmless. | none |
| M6 | NIT | `Stage0-measurer.md` §1, (4) | "One rule takes ≥ 1,000,000 `requestDomains`": the c4 JSON lists sizes up to 300000, and the 1M size appears only as row `rd-1M-last` (installMs 1372). The claim is supported, but by two places. | Name the `rd-1M-last` row beside the claim |
| M7 | NIT | probe permissions | The measurer's probe held `declarativeNetRequestFeedback`; 0.3 (A) does not. With it removed, V1–V6 reproduce (1)–(4), so the facts hold for the planned permission set. | Record this in the stage split |

**Not re-measured (read only):**
- 3c (i) and (ii) (`stage0-dnr-3c.txt`).
- 0.7 (`stage0-dnr-07.txt`).
- The `about:blank` history entry. Nobody measured it; it is left for the user's review of F1's decision or for RD-2.

## 7. Handoff

- **No process of mine remains:**
  - Chrome: closed by `Browser.close`.
  - Servers: PIDs 31840 and 14948, stopped.
  - Processes matching `s11b-stage0\verify`: 0.
  - Profile: deleted.
- **Left in place:** the scratch scripts and logs, in `%TEMP%\claude\s11b-stage0\verify\`.
- **For the step agent:**
  - Apply M1, M2 and M3 when writing the stage split.
  - Send F1's `newTab` decision and the dropped download fallback (F3) to the user, as both builders flag them.
  - Escalate M4.
