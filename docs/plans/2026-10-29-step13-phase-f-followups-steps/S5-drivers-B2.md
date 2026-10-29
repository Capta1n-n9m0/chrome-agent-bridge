# S5-drivers-B2 — the liveB20 chooser rows and #405 (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixer Sonnet, medium; verifiers Opus, medium; committer Sonnet, medium.
No Chrome, no daemon, no live run; the product daemon on 9234 was left alone.

## 1. Verdict

**DONE.** Slice B2 of the liveB20 driver is built and verified: decision #405 in the shared runner, and the actor and
judges of R20-CHOOSE-TWICE, R20-CHOOSE-KEPT and R20-CHOOSE-REFUSE-DIS. The driver is not run live. The stage was split
into B2 (this slice), B3 (R20-G2-1, R20-VERSION, `recipes/s13-win.ps1`) and B4 (the entry script, slice B's blocks,
RESTORE/LOGS, "How to run liveB20"), each at most ~600 lines, instead of the two slices S5-drivers-B.md §7 proposed:
the G2-1 and VERSION actors with their window helper would have pushed one slice past the cap.

## 2. Outputs

- `recipes/s13-r20-b.ts` (199 lines): commands `choose-twice`, `choose-kept`, `choose-refuse-dis`; judges on the
  s13-forms helpers (`busyExact`, `namesDevtools`, `mcpLineRead`/`mcpLineVerdict`, `disClass`/`disVerdict`) and the
  product's constants; every STOP is a `StopWhy` (exit 2), one test each.
- `recipes/test/s13-r20-b.test.ts` (138 lines).
- `recipes/s13-r20.ps1` (+29): `Get-R20Procs`, `Get-R20KillList`, `Install-R20StopKill`; `Register-R20Blocks` installs
  the override after the entry script's Run 17 load. `recipes/test/s13-r20-ps.test.ts` (+74): the kill override under
  the real load order (plain tree and daemon-in-tree), and the 8081 preflight refusal behaviourally for liveA20, liveB20
  and liveC20.
- `recipes/tsconfig.s13.json` (include entries); `recipes/tsconfig.s6.json` (one exclude, below).
- `npm test`: 5807 passed, 243 files → 5839 passed, 244 files (+32, none removed; verifier2). `npm run typecheck`, all
  eight `recipes/tsconfig*.json` and `npm run build` exit 0; the tree held only the slice's files after the build.
- Size: about 440 new lines of code and tests (cap 600).
- Commit: recorded by the committer (hash in the session journal and the final hand-back).

## 3. Verifier verdict

- Round 0 (`S5-drivers-B2-verifier.md`): **FAIL**, 1 MAJOR (F1: KEPT `different` read NOT MEASURED on a null digest
  before judging its counters, so "call ok, page got nothing" was not FAIL), 1 MINOR (F2: an unreadable dialog count read
  as 0), 3 NIT (F3, F4: wording departures; F5: #405's wording). Red proofs on copies outside the tree; slice A unchanged
  apart from #405.
- Fix round 1 (`S5-drivers-B2-fixer1.md`): F1, F2 fixed with tests; F3, F4 code comments; F5 left to the session agent.
- Round 1 re-check (`S5-drivers-B2-verifier2.md`): **PASS-with-notes**; mutants restoring the old order and the old
  parse turn the new tests red. One fix round of three used. Findings in all: 1 MAJOR, 1 MINOR, 3 NIT.

## 4. Deviations

- `recipes/tsconfig.s6.json` gained one exclude for `test/s13-r20-b.test.ts` (outside the briefed lane): its
  `test/*.test.ts` glob compiled the chrome-typed test and exited 2. Same treatment as slice A's tests; the verifier
  found it necessary and harmless.
- Three slices (B2, B3, B4) instead of two (above).
- KEPT's prelude compares the two wave files' SHA-256 from `state.json`, where the sheet says page-computed digests (the
  page computes one only after an upload; same effect). The MCP leg of TWICE opens its own tab with `browser_new_tab`
  where the sheet says "claims" (Run 19's pattern). Both are noted in code comments (F3, F4).

## 5. Proposed decisions

### 2026-10-29 · S5-drivers-B2: #405's tree kill spares the daemon; the chooser rows' unstated cases
**Decided:** (1) #405's "taskkill /F /T" is built as a ParentProcessId walk, descendants first, root last, that skips a
descendant running `daemon/dist/index.js` with its subtree; only the actor (`node`) gets it, every other name keeps Run
17's kill. (2) KEPT leg `same` prints `LEG … same RECORD`, so a passing row reads RECORD. (3) KEPT leg `different`: every
clause is judged first; NOT MEASURED (`digest-differs=n/a`) only when all hold and a digest stays unreadable. (4)
REFUSE-DIS: `btn` not answering TIMEOUT makes a PASS or RECORD NOT DISCRIMINATING; `ok` with a file on `self` is FAIL even
beside a refusing `flip`; legs run btn, flip, self. (5) TWICE: call 1 TIMEOUT within 4 900–8 000 ms of its send (Run 19's
margins for "about 5 s"); a serialised MCP (call 2 `other`, reply ≥ 4 000 ms after call 1's) prints only a CHECK line.
(6) STOP reasons: a failed control upload is `chooser-interception-left-on`, a native dialog count above 0
`dialog-left-open`, KEPT's prelude `throw-after-state`. **Why:** `taskkill /T` would kill a daemon an actor spawned
(verifier F5); the sheet leaves the rest unstated and each choice is the strict one. **Instead of:** a literal `/T`;
NOT MEASURED before the counters (F1, rejected). **Revisit if:** liveB20 shows a stale parent PID pulling in an
unrelated process (F5's note: a creation-time filter). **By:** Claude (proposed)

## 6. Findings

- Measured in PowerShell 5.1 (builder): `[\/]` in a .NET regex does not match a backslash; a Windows path check needs
  `[\\/]`. The daemon-in-tree test caught it.
- #405's wording ("taskkill /F /T") should be amended to the built mechanism (session agent; F5).

## 7. Handoff (B3, B4)

- B4's entry script must load Run 17's functions (`Get-R18Defs`) before `Register-R20Blocks`, so the override is the
  effective `Stop-S16Pid`.
- The actor asks for six dialog-count value steps (`R20-CHOOSE-TWICE-dlg`; `R20-CHOOSE-KEPT-{different,same}-dlg`;
  `R20-CHOOSE-REFUSE-DIS-{btn,flip,self}-dlg`), each an integer, with a closer in a `finally`; rows run with
  `-Actor 's13-r20-b'`.
- The driver window guard must accept the title `S13 chooser fixture` (`recipes/s12-win.ps1:17` is Run 19's, read-only:
  B4 extends it from an s13 file).
- The STOP/RETURN path must know `chooser-interception-left-on`, `dialog-left-open`, `throw-after-state`.
- The actor's fixture URL hard-codes port 8081, which the shared preflight now guarantees.

READ list given to the builder and verifiers: decisions #389, #391, #395, #399–#406; e2e plan §4.28 lines 1942–1960,
1980–1987, 1995–2000; phase doc § S5, Exit checks, Human gates, STOP rules; S5-drivers-B.md, S5-helpers.md §7,
S5-sheet.md §7, S5-sheet-verifier3.md, S5-liveA20.md §4 and §6, S5-drivers-A.md, S5-drivers-A2.md; `recipes/CLAUDE.md`;
the s13 recipes and tests, `recipes/s11b-r17.ps1` 84–130, the upload handlers and the chooser fixtures.
