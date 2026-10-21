# Step 6 — as-built register

**Phase doc:** `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` · **Steps dir:**
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/` · **Baseline:** `1a92d95` (301 tests,
22 files; 21 tools).

One section per stage, appended at stage close, never rewritten; corrections are dated notes.

## Stage 0 — spec audit (closed 2026-10-22, commit 618a3ae)

- **Outputs:** `stage0-audit.md` (34 findings: 0 CRITICAL, 8 MAJOR, 17 MINOR, 9 NIT; D1 move map;
  builder ambiguities B1–B18), `stage0-verifier.md` (38 spot-checks re-executed: 33 confirmed,
  3 partial on wording, 0 refuted). Verdict DONE, verifier PASS-with-notes.
- **Measured baseline** (auditor and verifier each, on `1a92d95`): `npm test` 301 passed in 22 files
  (shared 1/4, server 8/86, extension 13/211); typecheck and build exit 0; 21 tools.
- **Decisions taken:** decisions.md · 2026-10-22 · #13–#17.
- **Phase-doc amendments:** A1–A4, A13 by the step agent; A5–A12 and the F1/F2/F7/F8/F23 checkbox
  additions and MUX-7 by the session agent, each with a dated note.
- **Open decisions (user):** #13 (no welcome → `VERSION`), #14 (detached daemon vs `taskkill /T`),
  #15 (non-4002 close handling).
- **Measured fact, candidate gotcha:** on Windows `spawn(…, {detached: true})` keeps the child in
  the parent's process tree; `taskkill /T` on a live parent kills it.
- **Estimate vs actual:** 1.5 h estimated; ~26 min agent wall time.
- **Needs the user's keyboard:** nothing yet; a `bridge.token` file or `BRIDGE_TOKEN` for the D6 wave
  (F21: none exists on this machine).

## Stage D0 — shared types and codes (closed 2026-10-22, commit 6f7768c)

- **Outputs:** `shared/src/codes.ts` (22 codes: 9 daemon, 13 extension, plus `isErrorCode`),
  `shared/src/error.ts` (`BridgeError`, `WireError`, `toWire`, `fromWire`), `shared/src/protocol.ts`
  (hello `role/name/build/proto`, `WelcomeMessage`/`isWelcome`, `EventMessage`/`isEvent`,
  `ExtensionStatusParams`, request `timeoutMs?`), `shared/package.json` exports `./codes`, `./error`.
- **Measured:** `npm test` 301 → 322 passed (22 → 25 files); typecheck and build exit 0;
  `git diff 490c6c3..6f7768c -- extension/ server/` empty; extension bundle byte-identical (verifier).
- **Verifier:** PASS-with-notes (3 MINOR, 3 NIT, none blocking); D0.4 checked by reverting source
  only — 7 of 14 new tests fail, the hello/response regression guards pass as expected.
- **Contracts binding forward:** the wire error code is optional and normalises to `INTERNAL`;
  `isHello` rejects mistyped v2 fields; events are `{event, params}` with no `id`; `params` required.
- **Deviations:** the plan's `{code: ErrorCode | string, …}` became `code?` (decisions.md · 2026-10-22
  · #18); D0.4's stash instruction corrected in place (it stashed the new tests too).
- **Estimate vs actual:** 1 h estimated; ~12 min agent wall time.

## Stage D1 — repository split (closed 2026-10-22, commit 80e540c)

- **Outputs:** five workspaces `shared daemon sdk mcp extension`; all 21 tracked `server/` files moved
  as git renames (18 at R100); only import specifiers changed (`mcp/src/index.ts`, `registry.ts`,
  `tools.test.ts`); `lifecycle.ts` byte-identical. MCP bundle now at `mcp/dist/index.js`, differing
  from the old `server/dist/index.js` only in 14 esbuild path comments; `ws` still external.
  `docs/setup.md` (lines 18, 36, 46, 262) and `start-bridge.sh:20` point at `mcp/dist/index.js`.
- **Measured:** `npm test` 322 → 322 passed, 25 files (clean worktrees with `npm ci`, both sides);
  per package daemon 30, mcp 44, sdk 12, shared 25, extension 211. Typecheck all five, build
  mcp + extension green. `git log --follow daemon/src/wsHost.ts` keeps history. Extension diff empty.
- **Verifier:** PASS-with-notes.
- **Interim state binding forward:** `mcp` depends on `@bridge/daemon` (exports `./bridge`,
  `./connection`, `./wsHost`, `./startup`) until D5; `daemon/` has no build script until D3;
  `tsx` is a root devDependency (decisions.md · 2026-10-22 · #19).
- **Carried to later stages:** D3 adds `@bridge/shared` to `daemon/package.json`; D5 adds `ws` to
  `mcp` when it drops `@bridge/daemon`; D5 fixes `mcp/src/index.ts:35` (names `server/dist` in a
  runtime message) and `docs/e2e-test-plan.md` lines 19, 23, 88 (D5.5); D7 fixes `CLAUDE.md` lines
  48, 61, 94 (`server/src`).
- **Needs the user's keyboard:** the MCP config path now must be `<repo>/mcp/dist/index.js` (G6-1).
- **Estimate vs actual:** 1.5 h estimated; ~13 min agent wall time.
