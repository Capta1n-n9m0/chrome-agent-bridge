# S5-fixtures builder report

Model: Claude Sonnet 5.5, effort medium. UTC 20:13:49 to 20:17 on 2026-10-25. Context use about 80k tokens.

## 1. Verdict
DONE.

## 2. Outputs
Files (all untracked, nothing committed): `test-fixtures/s11-upload.html`, `s11-upload.js`, `s11-frame.html`, `s11-patched.html`, `s11-patched.js`; `recipes/s11-csp.py`; `recipes/test/s11-fixtures.test.ts` (24 tests), `recipes/test/s11-csp.test.ts` (7 tests).
Numbers: `npm test` 3593 passed / 144 files before, 3624 passed / 146 files after (+31). `npm run typecheck` exit 0. `npm run build` exit 0. `git status` after build: only the journal.md change from before plus my untracked files.
vitest picks up `recipes/test/*.test.ts` (include `**/test/**`). Python (miniconda) runs on this machine; the CSP test spawns `python -I`, port 0, kills it in afterAll/finally; no python process was left afterwards.

## Row to element map (reporter is `window.__s11.state()` and `#s11-report`)
- UP-1/5/8/PATCH/TWICE/RAW/NAV/DEVT/STALE/7J/RACE: `#up-single`
- UP-2: `#up-multi`
- UP-3: label text "Attach a file" (`#up-hidden-label`, for `display:none` `#up-hidden`; text unique on page); `#up-drop` (wrapper, one hidden `#up-drop-input`)
- UP-4: `#up-shadow-host` (open shadow, `#up-shadow-input`); `#up-frame-wrap` (iframe `src=s11-frame.html`, `#up-frame-input`)
- UP-6B: `#up-text`; `#up-single` with two paths; `#up-disabled`; `#up-dir` (webkitdirectory); `#up-two` (two file inputs)
- UP-8: same page via `recipes/s11-csp.py` (default port 8084; header `script-src 'self'`; no inline script anywhere)
- UP-PATCH: `s11-patched.html` (counter `window.__s11PatchedCalls` = `state().patchedCalls`, null on the plain page)
- UP-NAV: `s11-upload.html?nav=1` navigates (location.replace) when the observer sees the mark added; landing is `?s11=nav-after` (`state().arrivedAfterNav` true)
- Reporter fields per input: files (live), names, sizes, sha256 (FileReader + crypto.subtle), errors, changeEvents, inputEvents, `trusted[]` (isTrusted of each change); totals; pending (wait for 0); `marks.events` (added/removed/changed, with element id) over document, open shadow root and same-origin frame; `marks.final` deep count; `reset()`.

## 4. Deviations
- The frame is a real file `s11-frame.html` (salvage used srcdoc), so the content script injects as in a normal frame.
- Salvage fixtures test imported `recipes/s11-rules.ts` (S5-helpers' lane); replaced with local assertions. Hash test uses the FIPS "abc" vector literal and node:crypto for the other files, not the code under test.
- Added a CSP test serving the real fixtures from `test-fixtures` with the header.

## 6. Findings
- jsdom does not fetch iframe `src`; the test writes the frame file's markup into the frame document.
- Sheet note (no defect): 4.23 does not name the nav page URL; `?nav=1` is mine, S5-helpers must use it.
- Backslash-escape trap again: a Bash heredoc to python lost `\n`; fixed with Edit.

## 7. Handoff
No processes left. The step agent decides the commit after the verifier.
