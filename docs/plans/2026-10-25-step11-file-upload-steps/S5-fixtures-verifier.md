# S5-fixtures verifier report

Model: Claude Opus 5.5. UTC 2026-10-25T20:17:38Z to 2026-10-25T20:23:27Z. Role: verifier (`docs/agent-rules.md` §6).
Read: `docs/agent-rules.md`; `docs/e2e-test-plan.md` lines 1445–1540 (§4.23); phase doc 0.12 with its correction;
`recipes/CLAUDE.md`; decisions #251, #272. One read beyond the brief: `extension/src/content/upload-target.ts:22-32`
(the refusal constants), to compare them with the sheet's K-table.

## 1. Verdict

**PASS-with-notes.** Every exit check holds. Three MINOR findings and a few NITs; none blocks S5-helpers.

## 2. Exit checks

**(a) Rows → fixture.** Every id and text the §4.23 rows name is on the page:

| Row(s) | Element / field |
|---|---|
| UP-1, 5, 8, PATCH, TWICE, RAW, NAV, DEVT, STALE, 7J, RACE-A/B, FA, K-mcp-ok `css #up-single` | `#up-single` (`s11-upload.html:22`; `s11-patched.html:16`) |
| UP-2 | `#up-multi` (`multiple`, :26) |
| UP-3 | `{text:"Attach a file"}` → `<label id=up-hidden-label for=up-hidden>` (:29), `#up-hidden` `display:none` (:30); `#up-drop` holds one `hidden` input (:33-36) |
| UP-4 | `#up-shadow-host` (open root built by `s11-upload.js:214-227`); `#up-frame-wrap` → `s11-frame.html` `#up-frame-input` |
| UP-6B | `#up-text`, `#up-single` + 2 paths, `#up-disabled`, `#up-dir` (`webkitdirectory`), `#up-two` (two file inputs) |
| UP-NAV | `?nav=1` navigates on the first "added" to `?s11=nav-after` (`arrivedAfterNav`) |
| Reporter | `window.__s11.state()`: per input files, names, sizes, sha256 (lower-case hex), errors, changeEvents, inputEvents, `trusted[]`; `pending`; `marks.events` (`added`/`removed`/`changed`, light DOM + open shadow root + frame) and `marks.final` (deep count); `patchedCalls` |

The jsdom tests drive the product's own `locate`, `uploadInputOf`, `checkUploadInput`, `markUploadTarget`,
`unmarkUpload` against the shipped markup: each locator reaches the intended input and each UP-6B target gives the
refusal the row expects. The product constants at `upload-target.ts:25-31` equal the sheet's K-notinput, K-many,
K-disabled, K-dir, K-single character for character. No sheet defect found; the sheet does not name UP-NAV's URL
(the builder's own note; S5-helpers must use `?nav=1`).

**(b) Hashing.** `s11-fixtures.test.ts:192-199` checks the FIPS 180-2 "abc" vector `ba7816bf…15ad` (a published
constant) and `:201-220` compares against `node:crypto` `createHash`, plus the empty-text digest written out. Proven
discriminating by mutation on a scratch copy (`<scratchpad>/mut`, repo untouched; control run 24/24 pass):

| Mutation of `s11-upload.js` | Result |
|---|---|
| digest of an empty buffer instead of the file | 3 failed |
| `SHA-1` instead of `SHA-256` | 3 failed |
| hex without zero padding | 3 failed |
| every hash written to index 0 (order) | 1 failed |
| `isTrusted` always `true` | 1 failed |
| shadow root not observed | 1 failed |
| reporter reads the mark with `getAttribute` (patched page) | 1 failed |
| the `gen` guard removed (`:93`) | **0 failed** — see MINOR-1 |

**(c) CSP server.** Host is hard-coded `("127.0.0.1", port)` (`s11-csp.py:68`); `argv[1]` is parsed by `int()`, so
`python -I recipes/s11-csp.py 0.0.0.0` → `ValueError: invalid literal for int()`. Run on port 0: `netstat` →
`TCP 127.0.0.1:23217 … LISTENING 14228`; from the LAN address `192.168.128.68:23217` curl got no connection
(`lan:000`); on 127.0.0.1 and `localhost`: `HTTP/1.0 200`, `Content-Security-Policy: script-src 'self'`,
`Cache-Control: no-store`; `--path-as-is /../CLAUDE.md` → 404. I killed my PID 14228; afterwards `tasklist | grep
-ci python` = 0. The vitest runs also left no python. Its tests use port 0 only; the threaded test is
discriminating by construction (a single-threaded server would hang the fetch past vitest's 5 s timeout).

**(d) Every-stage checks** (fresh runs, same tree):
- `npm run typecheck` → exit 0.
- `npx vitest run --exclude "recipes/test/s11-*.test.ts"` → `Test Files 144 passed`, `Tests 3593 passed` (the
  baseline, re-derived); the two new files alone → `2 passed`, `31 passed` (24 + 7, matches a count of the `it`s
  incl. the 2-iteration loop); `npm test` → `Test Files 146 passed (146)`, `Tests 3624 passed (3624)`. 3593 + 31 = 3624 ✓.
- `npm run build` → exit 0 (`built extension → dist/`). `git status --short` after: only ` M journal.md` (pre-existing)
  and the slice's untracked files; no tracked change.
- Recipes typecheck: `tsconfig.s6.json` includes both new tests (`--listFilesOnly`) and exits 0; `.json`, `.fe`, `.s9`
  exit 0. `tsconfig.s10.json` exits 2 on `extension/src/upload-files.ts(133,10)/(134,70)` `__agentBridge` — pre-existing
  (S3 commit `d4718ca`), not this slice; see NIT-4.

**(e) Size.** 920 lines: fixtures + server 446 (64 + 254 + 12 + 22 + 15 + 79), tests 474. The non-test part is within
the ~600 budget; the overrun is tests only, the builder finished in one go (~80k context), and most files are the
salvage verbatim (`s11-upload.js`, `s11-csp.py`: 0 lines differ). An overrun that does not matter.

**Also checked.** No product code touched (`git diff --stat HEAD -- extension daemon sdk mcp shared` empty). Fixtures
and server: no `http(s)://`, no user path, no token, no `fetch`/storage/console (grep empty); the test's `homedir()`
only locates python. The server logs request paths (fixture paths). I started no server on 8080–8084 or 9234.

## 3. Findings

**MINOR-1 — the UP-TWICE test does not test what it names.** `recipes/test/s11-fixtures.test.ts:222-233` ("the late
read of the first never overwrites the second") passes with the `gen` guard at `test-fixtures/s11-upload.js:93`
deleted (mutation run above: 24 passed): jsdom's first read finishes first, so a stale write never comes late. In
the live UP-TWICE the calls are seconds apart, so the guard hardly matters there either, but the test claims
it. *Fix:* delay the first read (e.g. a stub `FileReader` whose first `onload` fires after the second) or rename the
test to what it shows (the second change's list is reported).

**MINOR-2 — the frame's reporter wiring is not tested.** `s11-fixtures.test.ts:108` accepts the id list with or
without `up-frame-input`, and the UP-4 frame test (`:147-161`) writes the frame document by hand without checking
that the reporter attached to it (`wireFrame`, `s11-upload.js:229-240`), or that a mark in the frame is recorded.
UP-4's "mark observed in the frame's document too" rests on code no test runs. *Fix:* after the `doc.write`, fire
`load` on the iframe and assert `inputs["up-frame-input"]` exists and a mark set and removed in the frame shows
in `marks.events`.

**MINOR-3 — a refusal's "no `input` event" cannot be judged on the text input.** The reporter listens only to file
inputs (`s11-upload.js:244-245`), so UP-6B's first step (a text input as the target) has no `change`/`input` record
for `#up-text`. The refusal clause still holds through the file inputs and the mark. *Fix:* also attach the
listeners to `#up-text` (any `input` with an id), or record in the S5-helpers rule that the text step is judged on
file inputs and the mark only.

**NIT-1** `s11-fixtures.test.ts:7` says the reporter is "judged by recipes/s11-rules.ts"; the import was removed
(builder deviation 2). Stale comment. **NIT-2** `s11-upload.js:7` names `recipes/s11.ts`, a file S5-helpers has
not made yet; it binds that name forward. **NIT-3** the live CSP tests are `describe.skipIf(!python)`: on a machine
without python the count silently drops by 4. Accepted, like the existing Python-server tests, but worth knowing
when comparing counts. **NIT-4 (not this slice)** `npx tsc --noEmit -p recipes/tsconfig.s10.json` exits 2 since S3
(`upload-files.ts:133-134`), while root `CLAUDE.md` Commands says all five recipes configs exit 0. For the step
agent or S5-helpers.

## 4. Handoff observations (not findings of this slice)

- Port **8080 is LISTENING by `Code.exe` PID 28444** (VS Code), not a fixture server. §4.23's STOP rule (#251) fires
  on that before liveA/liveB if it is still held; the u1 control of UP-8 and the plain fixture pages need 8080.
- Port **9234 had no listener** during this audit (`netstat`), and PID 14072 was not running; I touched neither.

## 5. Proposed decisions

None.
