# S3b — the download half, the narrowed rebuild, the options-page caps warning (step report)

Step agent: Opus, medium. Start tree `b82e009` (D3.3's `<start>` = `ecd254f`). Builder, verifiers and fixer: Opus,
medium; committer: Sonnet, medium. READ list given to every leaf: phase doc 0.5, 0.6, 0.8, 0.9, the Stages note, S3,
exit checks, STOP rules; decisions #293, #296, #300, #301, #302; `S3a.md`, `S2-builder.md` §7, `Stage0.md` §4,
`stage0-audit.md` F6; the code files of the lane; `extension/CLAUDE.md` § Safety gate.

## 1. Verdict

**DONE.** Verifier round 1 **FAIL** (`S3b-verifier.md`: one MAJOR, one MINOR, NITs); fix round 1 (`S3b-fixer.md`);
verifier round 2 **PASS-with-notes** (`S3b-verifier2.md`, two NITs). Stage verdict carried in the commit:
**PASS-with-notes**.

## 2. Outputs

- New pure module `extension/src/safety-hop.ts` (`BlockedHopWatcher`): a hit needs tab −1, `xmlhttprequest`, the own
  initiator, `net::ERR_BLOCKED_BY_CLIENT`, and a URL the call's own list blocks (tested in memory). A watch keeps only
  the time of its last hit; a hit counts within `HOP_SETTLE_MS` (300 ms) of the call's `fetch` rejection.
- `sw.ts`: the existing `onErrorOccurred` callback offers the event to the watcher before `ingest` (19 listeners before
  and after, no new top-level `await`); `downloadStart` gets its download-scope keeper handle; the rebuild is guarded by
  `rebuildsRules` (#302).
- `safety-call.ts`: one watch per `downloadStart` that holds rules, closed in `post()` before the release.
- `handlers/download.ts`: only a rejected `fetch` asks the watcher; a hit answers `DOMAIN_BLOCKED` with R14-5c's text
  (`BLOCKED_URL_MESSAGE`, no `data`); every other failure (404 `DOWNLOAD_HTTP` with `data`, body-read error, network
  error with no hit) keeps today's answer.
- `safety-state.ts` `rebuildsRules`: rebuild only on a changed `safety.blockList` value or an unreadable state.
- Options page: `blockListRuleWarnings` in `options-model.ts` (S1's `countRules`/`fitsCaps`; a 119-character regex
  bound, #300); `options.ts`/`options.html` show it; the text names line numbers, never a pattern. `docs/setup.md` one
  sentence. `docs/e2e-test-plan.md` §4.24: five placeholder rows (RD-DL-HOP, RD-DL-ERR, RD-DL-SOCKET,
  RD-REBUILD-NARROW, RD-CAPS-WARN).
- Tests: 4135/160 → **4158/161** (`npm test`, verifier 2's run); none removed; one S3a assertion re-pinned in place.
  typecheck, build and the six recipes typechecks exit 0.
- D3.3 `git diff ecd254f -- daemon shared sdk mcp` empty; D3.4 count tests unchanged (27/27/24); D3.5 log allowlist +0
  for S3 as a whole, log-scan and sentinel green. R14-5c and SAFE-5c texts unchanged.
- Size: about 517 lines at the build plus about 65 in the fix — over the ~400 cap, under the 600 split line.

## 3. Verifier findings per round

- Round 1: MAJOR — the hop check covered the whole `try`, so a 404 or body-read error waited 300 ms and could become
  `DOMAIN_BLOCKED` (losing `data`) if another download's hop was blocked — fixed. MINOR — a hit lasted the whole fetch,
  so a concurrent download's earlier hop could rename a genuine network failure — fixed (300 ms window; step-agent
  ruling to apply the verifier's proposal). NIT — unreadable→readable through another key untested — fixed. NIT —
  size, source before tests (red-without proven by the builder and verifier, 9 mutants red).
- Round 2: PASS-with-notes. NIT 1 — the window uses `Date.now` (`safety-hop.ts:95`); a forward clock jump can miss a
  hit (falls back to today's answer; the host is still never fetched); `performance.now()` suggested. NIT 2 —
  `HopWatch.blocked()` (`safety-hop.ts:51-53`) counts any hit and has no production caller. Both open.

## 4. Deviations

- Size over the ~400 cap without DONE-PARTIAL; accepted as one coherent deliverable, as S2 and S3a (#301, #302).
- The recogniser is stricter than 0.6's wording (type + own initiator, the fields Stage 0 measured).
- Source written before tests; red-without proven twice.

## 5. Proposed decisions (for the session agent)

### 2026-10-27 · S3b: a blocked download hop is recognised strictly, within a 300 ms window
**Decided:** a hop counts only for tab −1, `xmlhttprequest`, the own initiator, `ERR_BLOCKED_BY_CLIENT` and a URL the
call's own list blocks, and only within 300 ms of that call's `fetch` rejection (before it, or during a bounded wait
after it); only a rejected `fetch` waits. **Why:** the measured fields; the event/rejection order is unmeasured.
**Instead of:** no wait; a hit lasting the whole fetch (misnames a concurrent genuine failure). **Revisit if:** Run 17's
RD-DL-HOP records the order or a latency near 300 ms; two blocked downloads within 300 ms matter (both answer
`DOMAIN_BLOCKED`, fails safe). **By:** Claude (proposed)

### 2026-10-27 · S3b: the options warnings use one call's rule count and a 119-character regex bound
**Decided:** as `S3b-builder.md` §5. **Revisit if:** Run 17's RD-CAPS-WARN disagrees with 119. **By:** Claude (proposed)

## 6. Findings

- Gotcha candidates for `extension/CLAUDE.md`: the "not a network firewall" bullet gains the download half
  (`safety-hop.ts`); the rebuild runs only on block-list edits (#302); key files gain `safety-hop.ts`.
- Not measured: `onErrorOccurred` vs `fetch` rejection order (RD-DL-HOP).

## 7. Handoff

Nothing running; Chrome, daemon and extension untouched (the extension needs a reload for Run 17). Next: S4-sheet.
Leaf reports: `S3b-builder.md`, `S3b-verifier.md`, `S3b-fixer.md`, `S3b-verifier2.md`. `journal.md` left unstaged.
