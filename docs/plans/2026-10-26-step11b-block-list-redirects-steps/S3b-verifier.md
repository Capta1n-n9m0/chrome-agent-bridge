# S3b verifier: the download half, #302's narrowed rebuild, the options caps warning

Verifier: Claude Opus 5.5, medium effort. Tree audited: HEAD `b82e009` plus the uncommitted S3b working tree (12 tracked
files modified, 3 untracked). Read and run only; Chrome, the daemon and the extension not touched. Nothing committed.

## Verdict: **FAIL** (one MAJOR: finding 1)

Everything else holds: the counts, D3.3–D3.5, the typed rules, the release paths, the red proofs and 8 mutants. One
MAJOR blocks the stage. The `downloadStart` handler asks "was a hop blocked?" for every error its `try` throws, not
only when `fetch` itself rejected. The fix is one line. Finding 2 is a gap in the spec, not just in the code. The step
agent should rule on it.

## Exit checks (re-run on the audited tree)

| Check | Result |
|---|---|
| `npm run typecheck` | `TC EXIT 0` |
| `npm test` | `Test Files 161 passed (161)`, `Tests 4155 passed (4155)`. HEAD had 160/4135, so +20 and none removed (matches the builder). |
| `npm run build` | `built extension → dist/`, exit 0 |
| Six recipe typechecks | `tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`: all exit 0 |
| `git status --short` after the build | Only the stage's files, plus `journal.md` (already modified) and `S3b-builder.md`. No `dist` or other tracked changes. |
| D3.3 `git diff ecd254f --stat -- daemon shared sdk mcp` | Empty |
| D3.4 27 codes, 27 methods, 24 tools | The count tests pass unchanged in the full run, and no method, code or tool was added |
| D3.5 log scan | `git diff ecd254f --stat -- extension/test/log-allowlist.ts` is empty, so **+0**. Log-scan and sentinel are green in the full run. `safety-hop.ts` has no log call (static test, plus `safety-static.test.ts`). |
| R14-5c and SAFE-5c expected texts | Unchanged. The only e2e diff is the §4.24 append at line 1585 and later. |
| Every download-scope rule is typed `["xmlhttprequest"]` | Passes (`s3b-download-hop.test.ts:203-207`: tabIds `[-1]` and own initiator, read at fetch time) |
| A fetch failure with no blocked hop keeps today's answer | Tested (`:227-240`), but for **one call only**. See findings 1 and 2. |
| The recogniser stores and logs no URL | Deep-walk test `:96-112` plus static test `:114-119`. The log scan covers the `safety*.ts` files. |
| Lane | Every edited file is in the lane, and `docs/setup.md` gets one sentence. Nothing is outside the lane. |

**Red without the change.** I used a scratch `git worktree add --detach … HEAD` with its own `npm ci`, not the main
tree. Into HEAD's source I copied the new `safety-hop.ts` and the three test files, then ran
`s3b-download-hop`, `options-model`, `s3a-dnr-wiring` and `safety-static`. The result was `Tests 12 failed | 50
passed (62)`, the same 12 the builder names. The "keeps today's answer" test and the recogniser's own tests stay green
on HEAD, as the builder expected.

**Mutants** (on the full S3b tree in the worktree; `s3b-download-hop.test.ts` has 15 tests). Each mutant was **red**
(1 failed):
- the `type` check dropped;
- the `initiator` check dropped;
- `offer` called after `ingest`;
- `this.hop?.close()` removed;
- the `holding()` condition dropped;
- the `rebuildsRules` guard removed from `sw.ts`;
- `rebuildsRules` returning true for any key;
- the old/new equality replaced by `true`;
- the unreadable clause removed.

I removed the worktree safely: its link entries first (`rmdir`), then `git worktree remove --force`. Afterwards the
main `node_modules/.bin` (42 entries) and `@bridge/*` are intact.

## Findings

### 1. MAJOR: a non-fetch failure is re-mapped, and every such failure waits 300 ms
`extension/src/handlers/download.ts:62-65`.

The `catch` wraps the whole `try`. That covers the `fetch` itself, but also the `DOWNLOAD_HTTP` throw for `!res.ok` and
`res.arrayBuffer()`. So `call.hopBlocked()` is consulted for a failure where `fetch` resolved and no hop was blocked.

Two effects:
- **(a) A changed answer.** With concurrent downloads, a 404 on a page with no redirect answers `DOMAIN_BLOCKED`
  instead of `DOWNLOAD_HTTP`, and loses its `data {status, contentType}`. This happens when the call's watch saw
  another download's blocked hop (see finding 2).
- **(b) A slower answer.** Every 404, 5xx or body-read error with a non-empty list now waits the full 300 ms before
  answering.

This is outside 0.6: "a blocked hop makes `fetch` reject … Any other fetch failure keeps today's answer". It also
falls under the STOP line "a bridge call answering differently from its pre-Step-11b text on a page with no redirect".

**Evidence.** A scratch test (kept at
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\zz-verifier-attack.test.ts`),
run on the S3b tree:
```
× A: a 404 (no redirect) while another download's blocked hop was seen keeps DOWNLOAD_HTTP
  → expected 'DOMAIN_BLOCKED' to be 'DOWNLOAD_HTTP'
× C: a plain 404 with a non-empty list answers without the 300 ms wait
  → took 311 ms: expected 311 to be less than 150
```

**Fix.** Consult `hopBlocked()` only when `fetch` itself rejected. For example, set a `fetched` flag after `await
fetch(...)` and test `!fetched && call?.hopBlocked && await call.hopBlocked()`. Add tests A and C above as regression
tests: a 404 and a body-read error with a non-empty list and a marked watch keep `DOWNLOAD_HTTP` and today's error,
with no wait.

### 2. MINOR (spec gap; step agent to rule): concurrent downloads misattribute a hop, and the hit is sticky
`extension/src/safety-hop.ts:107` and `:37/:49`.

`offer` marks **every** live watch whose list blocks the URL, and the mark lasts until the watch closes. Download A's
watch stays open for its whole fetch, possibly minutes. Suppose download B's hop is blocked at any time during that
fetch, and A then fails for a genuine network reason. A answers `DOMAIN_BLOCKED` instead of today's error.

**Evidence** (same scratch file):
```
× B: a genuine network failure of A while B's hop was blocked keeps today's answer
  → expected BridgeError: That address is on the user'… to be an instance of TypeError
```

0.6's wording allows this: "an event … for a request outside any tab during the fetch whose URL the call's list
blocks". So this is a gap in the spec, not a departure from it. The answer still fails safe: it refuses and leaks
nothing.

**Fix (proposed).** Narrow the time window. A call's own blocked hop rejects its `fetch` at once, so the event
sits within about 300 ms of the rejection. Keep the hit's time and count it only if it is at most `HOP_SETTLE_MS`
before the rejection (or arrives during `settle`). The remaining ambiguity is two downloads blocked at the same moment.
Record that as a proposed decision with a Run 17 note. Add test B, which should pass once the event is more than
`HOP_SETTLE_MS` older than A's rejection.

### 3. NIT: no test for unreadable → readable through a key other than `blockList`
`extension/src/safety-state.ts:146-152`.

`rebuildsRules` is false for this transition. I traced it and it is safe:
- `rebuild(null)` only refuses the live calls (`safety-dnr-keeper.ts:141`); it does not block new ones;
- new calls install from their own reads.

So no rebuild is owed. The equality compares the stored strings, not the parsed lists, so a whitespace-only edit
rebuilds. That is conservative and harmless. A one-line test pinning the transition would document the choice.

### 4. NIT: size and test order
The stage adds about 517 lines against the ~400 cap. That is under #271's 600-line split threshold, and it is one
deliverable. The source was written before its tests, which the red proof above makes up for. The step agent decides,
as it did for S2 and S3a.

## Attacks that found nothing
- **The real event's shape.** `stage0-dnr-290-3.txt:151` (case 3d2, typed rule plus redirect) logs `error tab=-1
  xmlhttprequest init=chrome-extension://<id> net::ERR_BLOCKED_BY_CLIENT http://blocked.test:…`. That is exactly the
  four fields the stricter recogniser requires (`initiator` is the full origin, as the watcher builds it). The download
  fetch is the only worker `fetch` that is `xmlhttprequest`; `upload.ts:104` fetches `file:` URLs. So the stricter
  check misses nothing measured.
- **The 300 ms wait and timeouts.** `TIMEOUT` and the `checkFinalUrl` refusal are decided before `hopBlocked`, so they
  are unchanged. The wait ends early on a hit or on `close`. An empty list opens no watch and never waits. Apart from
  finding 1, a no-redirect, non-failing call is unaffected.
- **Release on every path.** `post()`'s `finally` calls `hop?.close()` before `dnr.release()` (`safety-call.ts:301-303`).
  The watch opens only after a successful install (`:277-280`) and only once (`!this.hop`; the second `effect()` of
  `checkFinalUrl` opens none, which a test checks). On disarm, nothing on the watch side outlives `post`.
- **The options warning.** It gives line numbers only, shown only on the human's options page. No pattern text, no
  wire path and no log are involved (a test checks `not.toMatch(/example|aaaa|bbbb/)`). The line numbers match the
  invalid-line numbering (`parseBlockList` keeps blank lines, so `i + 1` lines up).
- **`sw.ts`.** It adds no new listener and no top-level `await`. `offer` runs before `ingest` in the existing
  callback, `offer` never throws, and the guarded rebuild keeps the two `dnrKeeper.rebuild(` sites.

## Proposed decisions
### 2026-10-27 · S3b: only a rejected `fetch` asks whether a hop was blocked, and only a recent hit counts
**Decided:**
- `downloadStart` maps to `DOMAIN_BLOCKED` only when `fetch` itself rejected. `DOWNLOAD_HTTP` and body-read errors
  keep today's answer, with no wait.
- A watch's hit counts only within `HOP_SETTLE_MS` of the rejection.

**Why:** 0.6 says "any other fetch failure keeps today's answer", and the STOP line forbids a changed answer with no
redirect. **Instead of:** asking for every error in the `try`, with a hit that lasts the whole fetch. **Revisit if:**
Run 17's RD-DL-HOP shows the event arriving more than 300 ms before the rejection. **By:** Claude (proposed)
