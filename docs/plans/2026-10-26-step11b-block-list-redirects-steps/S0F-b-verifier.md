# Step 11b S0F-b — verifier report (a missing file is refused by the extension)

**Model / effort:** Opus 5.5, medium. **Role:** verifier (`docs/agent-rules.md` §6). **Date:** 2026-10-26. Read and run
only; no tracked file edited; no commit. Audited the builder's uncommitted tree (`S0F-b-builder.md`) against HEAD
`1d19289`.

## 1. Verdict

**PASS-with-notes.** Every exit check met; F.1's missing-file part met; two MINOR and three NIT findings, none of
which fails open in Chrome as measured.

## 2. Outputs

- `npm run typecheck` → exit 0 (all five projects). The six `recipes/tsconfig*.json` → exit 0 each.
- `npx vitest run` → `Test Files 157 passed (157)`, `Tests 3842 passed (3842)`. Before: 3825 / 156 (S0F-a.md line 25,
  the S0F-a verifier's count at the S0F-a tree = HEAD). Delta +17 = 15 (new `s0f-upload-exists.test.ts`) + 1 (handler)
  + 1 (sentinel); one handler test's expected order changed, none removed.
- `npm run build` → exit 0 (`built extension → dist/`). `git status --short` after the build: the stage's 9 files plus
  `journal.md` (not this stage's); no other tracked change.
- Mutation runs (script and output: scratchpad `mutants.mjs`, `mutants.json`, `mutants-out.txt`; each mutant applied
  to the working file, the named test files run, the original bytes written back; `md5sum -c` of both source files
  and an md5 of `git diff` matched before/after: `extension/src/upload-exists.ts: OK`, `…/handlers/upload.ts: OK`,
  `restored`). 20 mutants: **18 killed, 2 survived** (Finding 1).

| Mutant | Result |
|---|---|
| M1 other status → file; M2 failing first read → file; M3 timeout → file; M4 non-TypeError rejection → file; M5 sync throw → file; M6 no `file:` URL → file; M7 non-response → file; M10 only `missing` refuses; M13 status 0 → file | KILLED (1–2 of 15) |
| M11 no `abort()` at the timeout; M12 no `cancel()` after the first read; M14 empty body → unknown; M15 `encodeURI` instead of `encodeURIComponent` | KILLED |
| M16 probe after the first `effect()`+inject; M17 probe removed (= the handler at HEAD); M18 probe before the file-access check | KILLED (2, 2, 3 of 25 in `s3-upload-handler.test.ts`) |
| M19 the URL appended to the refusal message | KILLED (4 of 22, sentinel included) |
| M20 a `console.log` of the URL in the probe | KILLED (5 of 23: `log-sentinel` and `log-scan`) |
| **M8** `settle`'s rejection (e.g. `getReader()` throws) → file; **M9** a body without `getReader` → file | **SURVIVED** |

Red on the code before: M17 is the handler at HEAD — 2 failed / 23 passed, as the builder reports. The new test file
cannot load without `upload-exists.ts`. The sentinel test is red by import alone at HEAD, but M19/M20 show it catches a
path in a message and a log line.

## 3. Verifier focus, item by item

1. **0 files on the page.** `extension/src/handlers/upload.ts:104` runs `checkUploadFilesExist` after
   `fileAccessRefusal` (:100–101) and before the first `call?.effect()` (:105), `ensureContent`, the mark (:113) and
   `uploadByMark` (:114). The handler test asserts the log `["tabs.get","fileAccess","probe","probe"]` and 0 marks;
   M16/M17/M18 go red. Met.
2. **Fails closed.** Only `"file"` proceeds (`upload-exists.ts:119`); every other outcome throws. Statuses ≠ 200 and
   ≠ 0, non-TypeError rejections (the timeout's `AbortError` included), a failing read, a non-object, a string status,
   a synchronous throw, a 5 s silence and a null URL are tested and their fail-open mutants die. Two fail-open branches
   are untested (Finding 1); neither is reachable with Chrome's real `Response`.
3. **No path in a message, data or log.** Three fixed texts naming `paths[i]` only; `BridgeError` with no `data`. No
   log call in the new module (M20 red in `log-scan` and `log-sentinel`); `log-scan.test.ts` green with the allowlist
   unchanged. Met.
4. **URL building.** `uploadFileUrl` reuses the gate's own parser (`parseUploadPath` = `shapeOf`), so it probes exactly
   the segments the folder rule admitted: UNC, `\\?\`, relative, `..`/`.`, a URL, ADS, `<>"|?*` and trailing dot/space
   never reach it (refused at the gate; null here → `unknown`). Each segment is `encodeURIComponent`-ed, so `%` → `%25`,
   `#` → `%23`, `?` (POSIX) → `%3F`, space, `;&=+,[]{}` and non-ASCII (UTF-8) are escaped; separators cannot occur in a
   segment, so no `%2F`/`%5C` can be produced; a lone surrogate throws → null → refused. `\` and `/` in a Windows path
   are both separators, matching Windows itself; the drive letter's case is immaterial. The `sub dir\a b#ü%.txt` row is
   Stage 0's measured URL. One unmeasured edge: Finding 5.
5. **No existence oracle outside the gate.** The handler runs only after `GatedRouter` admitted the call at receipt
   (`router.ts:52–54`), and class `upload` runs the folder rule in every phase (`safety.ts:334–343`), so a disarmed
   bridge, a blocked/own/`file:` tab or a path outside the Upload folders never reaches the probe. A change between
   receipt and the probe (disarm, folder removed) is caught by the post-check, which runs after a thrown handler error
   and replaces the `BAD_PARAMS` with the gate's refusal (`router.ts:66–75`): the client learns nothing about that path.
   The `paths` probed are the strings of the same `params.paths` the gate read. Met.
6. **Bounded read.** One `reader.read()`, then `reader.cancel()` (M12 red); a non-200 body is cancelled. The 5 s race
   aborts the fetch (M11 red); in Chrome an abort errors the body stream, so a read pending at the timeout rejects into
   `settle`'s catch — no reader is left waiting. That last step is Chrome's behaviour, not tested (Finding 4).
7. **Spec note and §4.24.** The §10 note is accurate: after the file-access check, before the page, 200 + readable
   first chunk only, the three texts verbatim, the order `DISARMED > DOMAIN_BLOCKED > UPLOAD_REFUSED > BAD_PARAMS`
   (true: the gate precedes the handler and its post-check wins), TOCTOU accepted, SDK preflight unchanged. §4.24's
   F-RAW re-runs UP-RAW's exact call with the new expected text; F-RAW-2 proves an earlier present file does not reach
   the page; F-RAW-DIR, F-RAW-ENC (the encoding reaches the right file, by SHA-256) and F-RAW-OK (control) are the right
   live counterparts of the pure tests. Sensible as placeholders for S4-sheet (one suggestion: Finding 5).
8. **Size.** ~376 code+test lines against ~300 (Finding 3). Not gold-plated in substance.

## 4. Findings

**Finding 1 — MINOR — two fail-open mutants survive.** `extension/src/upload-exists.ts:68` (`typeof body.getReader !==
"function"` → `unknown`) and `:89` (`.catch((): ProbeOutcome => "unknown")`, the net under `settle`, reached e.g. when
`body.getReader()` throws — `:69` is outside any `try`). Evidence: `M8: SURVIVED (green) — settle rejection (e.g.
getReader throws) -> file`; `M9: SURVIVED (green) — body without getReader -> file`. Not reachable with Chrome's real
`Response` (its body is a `ReadableStream`), so not fail-open today, but the brief requires every fail-open mutant red.
Fix: add two rows to the "fails closed" table in `s0f-upload-exists.test.ts`: `{status:200, body:{}}` and
`{status:200, body:{getReader(){throw new TypeError("locked")}}}`, both `unknown`.

**Finding 2 — MINOR — the probe's worst case exceeds the call's timeout, and a late success still uploads.**
`upload-exists.ts:115–121`: 5 s per path, up to 20 paths (`UPLOAD_MAX_PATHS`) = 100 s, while the daemon waits
`timeoutMs ?? 30000 + 5000` (`daemon/src/route.ts:10–14`). If each probe is slow but succeeds (a slow mapped drive —
the case the builder added the bound for), the client gets `TIMEOUT` and the handler then attaches the files anyway.
The class of "handler continues after the daemon gave up" predates this stage (CDP's 15 s bound, #268), but this adds a
new up-to-100 s window. Unmeasured. Fix: one budget for the whole check (e.g. 5 s total, each probe getting the
remainder), or record it as a known limit in the decision the builder proposes.

**Finding 3 — NIT — size over the brief's cap.** `wc -l`: `upload-exists.ts` 122, its test 182; `git diff --numstat`:
handler +6/−1, `upload-paths.ts` +6, sentinel +33, handler test +26 → ~375 code+test lines vs ~300 (+25 %), plus 31
doc lines. The excess is the test file (182) and the unasked 5 s bound with its test. Neither is gold-plating: the bound
prevents a hung `file:` fetch from holding the call to the daemon's timeout, and the tests are what kills the
fail-open mutants. The three distinct refusal texts are a small, useful extra over one text. No split needed.

**Finding 4 — NIT — no test of a read that hangs after a 200.** The timeout test covers only a fetch that never
settles. A 200 whose first `read()` never resolves is covered by the same race (the outcome is `unknown`), but whether
`ctl.abort()` releases the pending read is Chrome's behaviour. Fix (optional): a fake whose `read` never resolves →
`unknown` at `UPLOAD_PROBE_TIMEOUT_MS`.

**Finding 5 — NIT — a POSIX-style path on Windows Chrome is probed as `file:///srv/…`.** Whether Chrome maps that URL
and `DOM.setFileInputFiles("/srv/…")` to the same file on Windows is unmeasured. Reachable only if the human enters a
POSIX folder on Windows; the probe then most likely fails ("missing"), which fails closed. Fix: none needed; S4-sheet
may note it.

**Spec/plan wording (not a code finding):** `Stage0-measurer.md:58–60` says "missing file or folder → rejects; a folder
→ status 0", self-contradictory; `stage0-dnr-3c.txt` shows the folder at status 0, which the code follows.

## 5. Stale lines (session agent's to fix; not edited)

- `extension/CLAUDE.md:258–259` (§ Uploads): "A raw `uploadFiles` of an absent file inside an allowed folder answers
  `ok`, the page gets a file: only the SDK preflight checks disk (UP-RAW, #284)".
- `extension/CLAUDE.md` Key files: add `upload-exists.ts` (pure, injected fetch, no log) and the probe in the
  `handlers/upload.ts` entry.
- `sdk/CLAUDE.md:111–112`: "This preflight is also the only check that a file exists: a raw `uploadFiles` of an absent
  file … answers `ok`".
- `docs/setup.md:812–814`: "the extension cannot see the disk, and a raw upload of a missing file … answered ok".
- All stay true for the loaded extension until a reload; Run 17's F-RAW measures the change.

## 6. Handoff

No process left running (vitest runs ended; no Chrome, daemon or server started). Tree as the builder left it: both
mutated files byte-identical after the runs (md5 above). The proposed decision in the builder's report §5 should note
Finding 2's limit if Finding 2 is not fixed.
