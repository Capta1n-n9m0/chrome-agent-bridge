# Stage 0 auditor — report (Step 11b)

**Model / effort:** Opus 5.5, medium · **Date:** 2026-10-26 · **Tree:** HEAD `9ddaa36` (product code = HEAD; the only
working-tree change is another agent's `journal.md` line, left untouched).

## 1. Verdict

**DONE.** Z.1's audit part is met: findings ranked with commands and output, counts recomputed, Step 9's and Step 11's
contracts re-run on port 0 (all held), every (proposed) decision attacked, the `hidden` reason decided, the home
predicate's table and S1's case table (104 rows) drafted. The DNR measurements are the sibling's; nine facts this audit
depends on are listed in `stage0-audit.md` §7. One CRITICAL (F1) is plan-side and contract-level.

## 2. Outputs

- `docs/plans/2026-10-26-step11b-block-list-redirects-steps/stage0-audit.md` — counts, contracts, today's `newTab`
  answer, 24 findings, the decision attacks, the home table, the `hidden` decision, the facts list, 10 proposed decisions.
- `docs/plans/2026-10-26-step11b-block-list-redirects-steps/stage0-s1-cases.md` — S1's table: 104 rows (the 50 numbered
  cases + 54 port, IP, `*.`, anchoring rows), expected column from the shipped `isUrlBlocked`, a draft DNR form, and its
  emulated match.
- Counts (commands in the audit §1): router methods **27**, codes **27 / 26 on the wire**, tools **24**, `npm test`
  **3811 / 154 files** (exit 0), log-scan allowlist **54** (15/33/0/6). All agree with the phase doc.
- Contracts: Step 9 set `Test Files 32 passed (32)` · `Tests 1059 passed (1059)`; Step 11 set `Test Files 16 passed
  (16)` · `Tests 499 passed (499)` (file lists and commands in the audit §2). Test count unchanged (no repo code).
- Scratch only (session scratchpad): `counts.ts`, `s1cases.ts`, `probes.ts` and their outputs, `npmtest.txt`,
  `contracts-s9.txt`, `contracts-s11.txt`.

## 3. Verifier verdict

Not applicable (leaf report).

## 4. Deviations

- The brief's reading list was followed except the design spec, read by grep over §6 and §10 for the redaction and
  `file:` lines (the parts this audit cites), not in full.
- S1's "proposed DNR form" column is a draft of `rulesOf` run as an emulation, so each row carries a computed agreement
  rather than only a form; the emulation is not a Chrome measurement and says so.

## 5. Proposed decisions

Ten, in `stage0-audit.md` §8 in the §5 format: (1) `newTab` opens `about:blank`, installs, then navigates (**for user
review**: the `tabCreated` url changes); (2) download rules name the worker fetch's type, never `websocket`; (3) drop
0.6's download fallback (**for user review**); (4) `navigate` names the blocked hop from `onErrorOccurred`; (5) a disarm
does not lift a running call's rules; (6) RD-5b and a single RD-2 outcome; (7) S1 emits only Chrome-accepted forms,
packed under the caps; (8) `back`/`forward` carry the tab rule; (9) the home predicate folds case and knows the macOS and
8.3 aliases; (10) `file:` tabs hidden as `"blocked"`.

## 6. Findings

- **F1 CRITICAL** — `newTab` cannot install a tab-scoped rule before `chrome.tabs.create`, its first side effect
  (`extension/src/handlers/tabs.ts:103-104`): the id does not exist yet. 0.4 (C)'s `newTab` half is unbuildable as written.
- **MAJOR** — F2 the download rule (`tabIds:[-1]`, own initiator, no `resourceTypes`) can block the offscreen socket
  `ws://127.0.0.1:<port>` (`offscreen.ts:26`) for a list holding `127.0.0.1`; F3 0.6's fallback answers `DOMAIN_BLOCKED`
  for a genuine network error on an allowed direct download, a STOP rule by construction; F4 a trailing-dot host
  escapes `requestDomains` (`DISAGREE 9 bank.example https://bank.example./ expected=true dnr=false`, the only
  disagreement of 104); F5 the post-check answers `allow` if the tab reads `chrome-error://…` or the 8083 URL (probe),
  so `navigate` would answer `ok` — 0.6 names no source for the "attempted URL"; F6 the `onErrorOccurred` event is
  dropped by the ingest gate before anything could read it (`sw.ts:101-115,143-146`); F7 `effect()` is shared by every
  tab method and runs twice for a download (`download.ts:151`, `safety-call.ts:247-250`); F8 a disarm that clears rules
  reopens the hop of a `tabs.update` in flight; F9 RD-5 passes with the rebuild deleted; F10 one rule Chrome rejects
  refuses every covered call with the "could not read its safety state" message, and the matcher has no list cap.
- **MINOR/NIT** — F11–F24 (RD-2's two outcomes, `back`/`forward`, rebuild wording, the wire leak of a rejection text,
  the empty-list call, D3.3's `<start>`, the loaded-build proof, S0F's pinned test and split, the home gaps, 3c (i)'s
  read, `minimum_chrome_version` 116, blind spots, #294's fresh profile, 0.7 confirmed by reading).
- **Measured on this machine (read-only):** `C:\DOCUME~1` exists (`existsSync` → `true`) and passes today's home rule;
  `C:\Uſers` does not exist (NTFS does not fold `ſ`). Worth an `extension/CLAUDE.md` bullet only if S0F adopts §5.
- **Today's `newTab` answer** onto a blocked redirect: success `{id, tab:"T<n>"}` (`handlers/tabs.ts:101-107`,
  `safety.ts:327-328`, `daemon/src/intercept.ts:627-636`); `INTERNAL "Timed out waiting for tab <id> to load"` if the
  page never completes.
- **`hidden` reason:** reuse `"blocked"` — the daemon's `forgetPage` keys on it (`daemon/src/intercept.ts:318,597`),
  the MCP only labels it (`mcp/src/tools/registry.ts:149-150`), the SDK drops unknown values (`sdk/src/client.ts:404`);
  no client branches on blocked vs `file:`.

## 7. Handoff

- No processes left; nothing bound; no Chrome touched; no repo file changed beyond the two outputs and this report.
- The step agent needs: the sibling's facts (audit §7) to settle F2, F4, F5, F10, F11, F17, F20; the user for F1 and
  F3 (contract-level) before S3; F18's split before S0F starts.
