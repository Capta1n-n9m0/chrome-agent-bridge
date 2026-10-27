# S2b — verifier report, round 2 (affected items only)

Role: verifier (`docs/agent-rules.md` §6), Opus, medium. Items re-checked: S2b-verifier.md F1 (MCP `{args, saveTo}` leg
untested) and F3 (the `docs/setup.md` troubleshooting quote). Claims audited: S2b-fixer.md. F2, F4, F5 are the session
agent's and were not re-checked. Layer followed: the round-1 findings as written.

## 1. Verdict

**PASS** (0 CRITICAL, 0 MAJOR, 0 MINOR, 0 NIT). F1 and F3 are closed.

## 2. F1 — the new case and mutant M7

- The case (`mcp/test/s12-args-cross.test.ts:166-173`, in B2.3, hello without `evaluateArgs`):
  `browser_evaluate({expression: "(a) => a", args: SENTINEL, saveTo: <root>/m.json, tab})` → rejects `VERSION` with
  "reload it at chrome://extensions"; `m.json` and `m.json.part` absent; `ext.evaluateCalls()` is `[]` after it.
- Green: `npx vitest run mcp/test/s12-args-cross.test.ts` → `Tests 3 passed (3)`.
- M7 (run by me): pre-hash `bd484940…c14fe9 mcp/src/tools/registry.ts`; exactly one line `            ...argsPart,`
  at line 851 (`grep -c` → 1), deleted with `sed -i '851{…d}'` (`git diff --stat` 23+ → 22+). Run →
  `Tests 1 failed | 2 passed (3)`, B2.3 failing: `expected Error: wrote 0 bytes, expected undefined to match object
  { code: 'VERSION', …(1) }` (the call reached the fake). Restored from a copy; `sha256sum -c` →
  `mcp/src/tools/registry.ts: OK`.
- Hygiene: the server is `new WsHost(…, { port: 0, … })` (line 88); `root` is a `mkdtempSync` dir removed by
  `rmSync(root, {recursive, force})` in `afterEach` (line 123); after the green, mutant and suite runs,
  `ls $TEMP | grep -c bridge-s12-args-` → 0. The case carries `SENTINEL`, and B2.3 ends with `expectNoSentinel()`
  (daemon logger lines + every `console.*` line), which passes.

## 3. F3 — the setup.md quote

`docs/setup.md:1249-1250` quotes "the Chrome extension is an older build — reload it at chrome://extensions" and, for
an evaluate call with `args`, "…an older build without evaluate args — reload it at chrome://extensions". Both are
word-for-word substrings of `RELOAD_HINT` and `ARGS_RELOAD_HINT` (`daemon/src/intercept.ts:37-41`); the leading "…"
elides "the Chrome extension is an", and both texts' tail "(↻ on Chrome Agent Bridge)" is left out of both quotes alike.

## 4. Fixer's lane

`git diff --numstat -- daemon sdk mcp docs/setup.md` matches S2b-builder.md §2 for every file but the two named:
handshake 13, intercept 13, wsHost 2, registry 23, client 3, evaluate-save 21, tab 14, s2-focus-first 18,
s3-signatures 6 (unchanged); `docs/setup.md` +3/−2 (builder: Tools row +1/−1; fixer: the troubleshooting row, one
line → two); `mcp/test/s12-args-cross.test.ts` 201 → 208 lines (+7, the case above). `daemon/test/s12-args-feature.test.ts`
still 58. The `docs/decisions.md` / `journal.md` and `recipes/` changes in the tree are other agents' (not S2b files).
No byte snapshot of the builder's state exists, so the comparison is by per-file line counts plus the diff of the two
touched spots.

## 5. Checks

| Command | Result |
|---|---|
| `npx vitest run mcp sdk daemon` | Test Files 64 passed (64); Tests 1121 passed (1121) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; `git status --porcelain \| md5sum` identical before and after (`dcccd5d6…`) |

## 6. Size (re-counted)

Code +89 (`daemon/src`, `sdk/src`, `mcp/src` numstat); tests 18 + 6 + 58 + 208 = 290; docs +3. Total 382 = 1.27× the
300 cap (#339). Code alone is under the cap and the extra is tests and docs, within §7's 1.5× (450) tests-only
allowance. The fix round added 8 lines (+7 test, +1 docs).

## 7. Handoff

Nothing edited but this report; the mutant was restored hash-identical. No processes left; port 0 only; no Chrome;
nothing on 9234. Not committed (brief).
